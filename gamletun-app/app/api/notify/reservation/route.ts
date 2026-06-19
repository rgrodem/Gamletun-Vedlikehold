// Varsel når utstyr reserveres. Sendes til alle administratorer (push + e-post).
// Kalles i bakgrunnen fra createReservation (lib/reservations.ts).
//
// Mottakere: alle admin + ev. RESERVATION_NOTIFY_EMAIL/NOTIFY_EMAIL.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { sendPushToAdmins } from '@/lib/push';
import { getAdminEmails } from '@/lib/admins';

export async function POST(request: NextRequest) {
  // Bare innloggede brukere kan utløse varsler.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }

  let reservationId: string | undefined;
  try {
    ({ reservationId } = await request.json());
  } catch {
    /* tomt body håndteres under */
  }
  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId mangler' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.warn('SUPABASE_SERVICE_ROLE_KEY mangler – reservasjonsvarsel ikke sendt');
    return NextResponse.json({ sent: 0, skipped: 'service_role_missing' });
  }

  const { data: reservation, error } = await admin
    .from('equipment_reservations')
    .select(`
      id, start_time, end_time, notes,
      equipment:equipment_id (id, name),
      user_profile:user_id (full_name)
    `)
    .eq('id', reservationId)
    .single();

  if (error || !reservation) {
    return NextResponse.json({ error: 'Fant ikke reservasjonen' }, { status: 404 });
  }

  const equipment = Array.isArray(reservation.equipment)
    ? reservation.equipment[0]
    : reservation.equipment;
  const profile = Array.isArray(reservation.user_profile)
    ? reservation.user_profile[0]
    : reservation.user_profile;

  const formatTime = (value: string) =>
    new Date(value).toLocaleString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const origin = new URL(request.url).origin;
  const html = `
    <h2>Ny reservasjon: ${equipment?.name ?? 'Ukjent utstyr'}</h2>
    <p><strong>${profile?.full_name ?? 'Ukjent bruker'}</strong> har reservert utstyret.</p>
    <p>
      Fra: ${formatTime(reservation.start_time)}<br/>
      Til: ${reservation.end_time ? formatTime(reservation.end_time) : 'Ikke angitt'}
    </p>
    ${reservation.notes ? `<p>Notat: ${reservation.notes}</p>` : ''}
    <p><a href="${origin}/equipment/${equipment?.id ?? ''}">Åpne utstyrssiden i Gamletun Vedlikehold</a></p>
  `;

  // Mottakere: alle administratorer + ev. eksplisitt konfigurert adresse.
  const recipients = new Set<string>(await getAdminEmails(admin));
  const extra = process.env.RESERVATION_NOTIFY_EMAIL || process.env.NOTIFY_EMAIL;
  if (extra) recipients.add(extra);

  const subject = `Reservert: ${equipment?.name ?? 'utstyr'} (${profile?.full_name ?? 'ukjent bruker'})`;
  let sent = 0;
  for (const to of recipients) {
    if (await sendEmail({ to, subject, html })) sent += 1;
  }

  // Push til alle administratorer (om VAPID er konfigurert).
  const pushed = await sendPushToAdmins({
    title: `Ny reservasjon: ${equipment?.name ?? 'utstyr'}`,
    body: `${profile?.full_name ?? 'Ukjent bruker'} reserverte utstyret`,
    url: `/equipment/${equipment?.id ?? ''}`,
  });

  return NextResponse.json({ sent, pushed });
}
