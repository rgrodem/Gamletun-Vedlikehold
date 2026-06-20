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
  const html = `
    <h2>Du er invitert til ${appName}</h2>
    <p>Hei${fullName && fullName !== email ? ' ' + fullName : ''}! Du har fått tilgang til ${appName}.</p>
    <p>Klikk på lenken for å sette ditt eget passord og komme i gang:</p>
    <p><a href="${inviteUrl}">Sett passord og logg inn</a></p>
    <p style="color:#888;font-size:13px">Lenken er personlig. Har du ikke ventet denne e-posten, kan du se bort fra den.</p>
  `;
  const emailed = await sendEmail({ to: email, subject: `Invitasjon til ${appName}`, html });

  return NextResponse.json({ ok: true, emailed });
}
