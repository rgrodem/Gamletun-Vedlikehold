// Inviter en ny bruker (kun admin). Oppretter brukeren i Supabase Auth, lager
// en profil med ønsket rolle, og sender en invitasjon via Resend (vårt
// verifiserte domene) med lenke til vår egen auth-callback + sett-passord-side.
//
// Vi bruker generateLink('invite') i stedet for inviteUserByEmail slik at vi
// sender e-posten selv (Resend) og slipper å avhenge av Supabase-SMTP.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  // 1) Bare innlogget admin kan invitere.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Krever administrator' }, { status: 403 });
  }

  // 2) Les og valider input.
  let body: { email?: string; fullName?: string; role?: string } = {};
  try { body = await request.json(); } catch { /* tomt body håndteres under */ }
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim() || email || '';
  const role: 'admin' | 'user' = body.role === 'admin' ? 'admin' : 'user';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Service-nøkkel mangler (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  // 3) Opprett invitert bruker + generer engangstoken.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName } },
  });

  if (linkError || !link?.user || !link.properties?.hashed_token) {
    const msg = linkError?.message ?? '';
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      return NextResponse.json({ error: 'Brukeren finnes allerede' }, { status: 409 });
    }
    console.error('Invitasjon feilet:', msg);
    return NextResponse.json({ error: 'Kunne ikke opprette invitasjon' }, { status: 500 });
  }

  // 4) Profil med ønsket rolle. INSERT er trygt: triggeren guard_profile_role
  //    gjelder kun UPDATE, så vi kan sette 'admin' direkte for en ny bruker.
  const { error: profileError } = await admin.from('profiles').insert({
    id: link.user.id,
    full_name: fullName,
    role,
  });
  if (profileError && !profileError.message.toLowerCase().includes('duplicate')) {
    console.error('Kunne ikke opprette profil for invitert bruker:', profileError.message);
  }

  // 5) Bygg lenke til vår egen callback (verifyOtp) og send via Resend.
  const origin = new URL(request.url).origin;
  const inviteUrl =
    `${origin}/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}` +
    `&type=invite&next=/sett-passord`;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Gamletun Vedlikehold';
  const loginUrl = `${origin}/login`;
  const greeting = `Hei${fullName && fullName !== email ? ' ' + fullName : ''}!`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;line-height:1.5;max-width:520px">
      <h2>Du er invitert til ${appName}</h2>
      <p>${greeting} Du har fått tilgang til ${appName}.</p>

      <h3 style="margin-bottom:4px">1. Sett passordet ditt</h3>
      <p style="margin-top:4px">Klikk på knappen for å velge ditt eget passord og logge inn:</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;background:#2f6b3f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Sett passord og logg inn</a>
      </p>
      <p style="color:#888;font-size:13px">Virker ikke knappen? Kopier denne lenken inn i nettleseren:<br>${inviteUrl}</p>

      <h3 style="margin-bottom:4px">2. Logg inn senere</h3>
      <p style="margin-top:4px">Neste gang logger du inn her — lagre gjerne denne e-posten eller bokmerk siden:<br>
        <a href="${loginUrl}">${loginUrl}</a>
      </p>

      <h3 style="margin-bottom:4px">3. Legg appen på hjemskjermen (anbefales)</h3>
      <p style="margin-top:4px">Da får du et eget app-ikon og slipper å lete etter lenken:</p>
      <ul style="margin-top:4px">
        <li><strong>iPhone (Safari):</strong> åpne lenken over, trykk Del-ikonet (firkant med pil opp) nederst, og velg «Legg til på Hjemskjerm».</li>
        <li><strong>Android (Chrome):</strong> åpne lenken over, trykk meny-ikonet (⋮) øverst til høyre, og velg «Installer app» / «Legg til på startskjerm».</li>
      </ul>

      <p style="color:#888;font-size:13px;margin-top:24px">Innloggingslenken i punkt 1 er personlig. Har du ikke ventet denne e-posten, kan du se bort fra den. Spørsmål? Bare svar på denne e-posten.</p>
    </div>
  `;
  const text = [
    `Du er invitert til ${appName}`,
    ``,
    `${greeting} Du har fått tilgang til ${appName}.`,
    ``,
    `1. SETT PASSORDET DITT`,
    `Åpne denne lenken for å velge ditt eget passord og logge inn:`,
    inviteUrl,
    ``,
    `2. LOGG INN SENERE`,
    `Neste gang logger du inn her (lagre e-posten eller bokmerk siden):`,
    loginUrl,
    ``,
    `3. LEGG APPEN PÅ HJEMSKJERMEN (anbefales)`,
    `- iPhone (Safari): åpne lenken over, trykk Del-ikonet og velg «Legg til på Hjemskjerm».`,
    `- Android (Chrome): åpne lenken over, trykk meny-ikonet (⋮) og velg «Installer app».`,
    ``,
    `Innloggingslenken i punkt 1 er personlig. Har du ikke ventet denne e-posten, kan du se bort fra den. Spørsmål? Bare svar på denne e-posten.`,
  ].join('\n');
  const emailed = await sendEmail({
    to: email,
    subject: `Invitasjon til ${appName}`,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO || 'rune@gamletun.no',
  });

  return NextResponse.json({ ok: true, emailed });
}
