// Varsler på e-post når det meldes feil på utstyr.
// Kalles fra ReportFaultModal etter at feilmeldingen er opprettet.
//
// Mottakere:
//  - NOTIFY_EMAIL (vedlikeholdsansvarlig), hvis satt
//  - alle med aktiv reservasjon på utstyret (krever verifisert domene i
//    Resend; med testavsenderen leveres kun til Resend-kontoens egen adresse)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToAll } from '@/lib/push';
import { sendEmail } from '@/lib/email';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Lav',
  medium: 'Medium',
  high: 'Høy',
  urgent: 'Akutt',
};

export async function POST(request: NextRequest) {
  // Bare innloggede brukere kan utløse varsler.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }

  let workOrderId: string | undefined;
  try {
    ({ workOrderId } = await request.json());
  } catch {
    /* tomt body håndteres under */
  }
  if (!workOrderId) {
    return NextResponse.json({ error: 'workOrderId mangler' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Service-nøkkel ikke konfigurert ennå — varsling er valgfri, ikke feil.
    console.warn('SUPABASE_SERVICE_ROLE_KEY mangler – feilvarsel ikke sendt');
    return NextResponse.json({ sent: 0, skipped: 'service_role_missing' });
  }

  const { data: workOrder, error } = await admin
    .from('work_orders')
    .select('id, title, description, priority, equipment:equipment_id (id, name)')
    .eq('id', workOrderId)
    .eq('type', 'corrective')
    .single();

  if (error || !workOrder) {
    return NextResponse.json({ error: 'Fant ikke feilmeldingen' }, { status: 404 });
  }

  const equipment = Array.isArray(workOrder.equipment)
    ? workOrder.equipment[0]
    : workOrder.equipment;

  // Finn aktive reservasjoner på utstyret — de bør få beskjed.
  const now = new Date().toISOString();
  const { data: reservations } = await admin
    .from('equipment_reservations')
    .select('user_id')
    .eq('equipment_id', equipment?.id ?? '')
    .eq('status', 'active')
    .or(`end_time.is.null,end_time.gt.${now}`);

  const reserverIds = Array.from(
    new Set((reservations || []).map((r) => r.user_id as string))
  ).filter((id) => id !== user.id); // ikke varsle den som selv meldte feilen

  const recipients = new Set<string>();
  if (process.env.NOTIFY_EMAIL) recipients.add(process.env.NOTIFY_EMAIL);

  for (const reserverId of reserverIds) {
    const { data } = await admin.auth.admin.getUserById(reserverId);
    if (data?.user?.email) recipients.add(data.user.email);
  }

  if (recipients.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 'no_recipients' });
  }

  const origin = new URL(request.url).origin;
  const priorityLabel = PRIORITY_LABELS[workOrder.priority] || workOrder.priority;
  const html = `
    <h2>Utstyr meldt defekt: ${equipment?.name ?? 'Ukjent utstyr'}</h2>
    <p><strong>${workOrder.title}</strong> (prioritet: ${priorityLabel})</p>
    ${workOrder.description ? `<p>${workOrder.description}</p>` : ''}
    ${
      workOrder.priority === 'low'
        ? '<p>Feilen har lav prioritet — utstyret kan fortsatt reserveres og brukes.</p>'
        : '<p>Utstyret kan ikke reserveres før feilen er utbedret.</p>'
    }
    <p><a href="${origin}/equipment/${equipment?.id ?? ''}">Åpne utstyrssiden i Gamletun Vedlikehold</a></p>
  `;

  let sent = 0;
  for (const to of recipients) {
    if (await sendEmail({ to, subject: `Feil meldt: ${equipment?.name ?? 'utstyr'}`, html })) {
      sent += 1;
    }
  }

  // Push-varsel i tillegg til e-post (om VAPID er konfigurert).
  const pushed = await sendPushToAll({
    title: `Feil meldt: ${equipment?.name ?? 'utstyr'}`,
    body: `${workOrder.title} · prioritet ${priorityLabel}`,
    url: `/equipment/${equipment?.id ?? ''}`,
  });

  return NextResponse.json({ sent, pushed });
}
