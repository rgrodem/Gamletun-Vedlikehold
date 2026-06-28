// Send en ny passordlenke til en bruker (kun admin). Bruker
// generateLink('recovery') og sender lenken selv via Resend, slik at den peker
// til vår egen auth-callback + sett-passord-side. Fungerer både for brukere som
// aldri fullførte invitasjonen og for de som har glemt passordet.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  // 1) Bare innlogget admin.
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

  // 2) Input.
  let body: { id?: string } = {};
  try { body = await request.json(); } catch { /* tomt body håndteres under */ }
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Mangler bruker-id' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Service-nøkkel mangler (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  // 3) Finn brukerens e-post.
  const { data: target, error: getErr } = await admin.auth.admin.getUserById(id);
  const email = target?.user?.email;
  if (getErr || !email) {
    return NextResponse.json({ error: 'Fant ikke brukeren' }, { status: 404 });
  }

  // 4) Generer recovery-token.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    console.error('Recovery-lenke feilet:', linkError?.message ?? '');
    return NextResponse.json({ error: 'Kunne ikke lage passordlenke' }, { status: 500 });
  }

  // 5) Send lenke til vår egen callback (verifyOtp) via Resend.
  const origin = new URL(request.url).origin;
  const resetUrl =
    `${origin}/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}` +
    `&type=recovery&next=/sett-passord`;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Gamletun Vedlikehold';
  const loginUrl = `${origin}/login`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;line-height:1.5;max-width:520px">
      <h2>Sett nytt passord for ${appName}</h2>
      <p>Klikk på knappen for å velge et nytt passord og logge inn:</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;background:#2f6b3f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Sett nytt passord</a>
      </p>
      <p style="color:#888;font-size:13px">Virker ikke knappen? Kopier denne lenken inn i nettleseren:<br>${resetUrl}</p>
      <p style="color:#888;font-size:13px">Logg inn senere her: <a href="${loginUrl}">${loginUrl}</a></p>
      <p style="color:#888;font-size:13px;margin-top:24px">Lenken er personlig. Ba du ikke om dette, kan du se bort fra e-posten. Spørsmål? Bare svar på denne e-posten.</p>
    </div>
  `;
  const text = [
    `Sett nytt passord for ${appName}`,
    ``,
    `Åpne denne lenken for å velge et nytt passord og logge inn:`,
    resetUrl,
    ``,
    `Logg inn senere her: ${loginUrl}`,
    ``,
    `Lenken er personlig. Ba du ikke om dette, kan du se bort fra e-posten. Spørsmål? Bare svar på denne e-posten.`,
  ].join('\n');
  const emailed = await sendEmail({
    to: email,
    subject: `Nytt passord for ${appName}`,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO || 'rune@gamletun.no',
  });

  return NextResponse.json({ ok: true, emailed });
}
