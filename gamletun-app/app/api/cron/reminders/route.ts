// Daglig vedlikeholdsjobb, kjøres av Vercel Cron (se vercel.json):
//  1. Rydder opp reservasjoner med passert sluttid (samme opprydding som
//     forsiden gjør ved last — her skjer den daglig uansett).
//  2. Sender påminnelse på e-post om forfalt og snart forfallende
//     vedlikehold, inkludert ordrer forfalt på timeteller (due_hours).
//
// Vercel sender automatisk "Authorization: Bearer <CRON_SECRET>" når
// miljøvariabelen CRON_SECRET er satt — uten gyldig hemmelighet avvises kallet.
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshEquipmentStatusWithClient } from '@/lib/equipment-status-core';
import { sendEmail } from '@/lib/email';

const ACTIVE_STATUSES = ['open', 'scheduled', 'in_progress', 'waiting_parts'];
const DUE_SOON_DAYS = 7;

interface ReminderWorkOrder {
  id: string;
  title: string;
  due_date: string | null;
  due_hours: number | null;
  equipment: { id: string; name: string; usage_hours: number | null } | { id: string; name: string; usage_hours: number | null }[] | null;
}

function equipmentOf(wo: ReminderWorkOrder) {
  return Array.isArray(wo.equipment) ? wo.equipment[0] : wo.equipment;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.warn('SUPABASE_SERVICE_ROLE_KEY mangler – daglig jobb hoppet over');
    return NextResponse.json({ skipped: 'service_role_missing' });
  }

  // 1) Fullfør reservasjoner med passert sluttid og oppdater utstyrsstatus.
  const nowISO = new Date().toISOString();
  const { data: expiredReservations, error: expireError } = await admin
    .from('equipment_reservations')
    .update({ status: 'completed', updated_at: nowISO })
    .eq('status', 'active')
    .not('end_time', 'is', null)
    .lte('end_time', nowISO)
    .select('equipment_id');

  if (expireError) {
    console.error('Kunne ikke fullføre utgåtte reservasjoner:', expireError);
  }
  const expiredEquipmentIds = Array.from(
    new Set((expiredReservations || []).map((r) => r.equipment_id as string))
  );
  await Promise.all(
    expiredEquipmentIds.map((id) => refreshEquipmentStatusWithClient(admin, id))
  );

  // 2) Påminnelse på e-post.
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.warn('NOTIFY_EMAIL er ikke satt – påminnelse ikke sendt');
    return NextResponse.json({
      expiredReservations: expiredEquipmentIds.length,
      sent: 0,
      skipped: 'notify_email_missing',
    });
  }

  const { data, error } = await admin
    .from('work_orders')
    .select('id, title, due_date, due_hours, equipment:equipment_id (id, name, usage_hours)')
    .in('status', ACTIVE_STATUSES)
    .or('due_date.not.is.null,due_hours.not.is.null')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Kunne ikke hente arbeidsordrer for påminnelse:', error);
    return NextResponse.json({ error: 'Databasefeil' }, { status: 500 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const soonEnd = new Date(todayStart);
  soonEnd.setDate(soonEnd.getDate() + DUE_SOON_DAYS);
  soonEnd.setHours(23, 59, 59, 999);

  const parseDue = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(value);
  };

  const all = (data || []) as ReminderWorkOrder[];
  const isDateOverdue = (wo: ReminderWorkOrder) =>
    wo.due_date != null && parseDue(wo.due_date) < todayStart;
  const isHoursOverdue = (wo: ReminderWorkOrder) => {
    const equipment = equipmentOf(wo);
    return (
      wo.due_hours != null &&
      equipment?.usage_hours != null &&
      equipment.usage_hours >= wo.due_hours
    );
  };

  const overdue = all.filter((wo) => isDateOverdue(wo) || isHoursOverdue(wo));
  const dueSoon = all.filter(
    (wo) =>
      !overdue.includes(wo) &&
      wo.due_date != null &&
      parseDue(wo.due_date) >= todayStart &&
      parseDue(wo.due_date) <= soonEnd
  );

  if (overdue.length === 0 && dueSoon.length === 0) {
    return NextResponse.json({
      expiredReservations: expiredEquipmentIds.length,
      sent: 0,
      skipped: 'nothing_due',
    });
  }

  const origin = new URL(request.url).origin;
  const row = (wo: ReminderWorkOrder) => {
    const equipment = equipmentOf(wo);
    const reasons: string[] = [];
    if (wo.due_date) {
      reasons.push(`frist ${new Date(wo.due_date).toLocaleDateString('nb-NO')}`);
    }
    if (isHoursOverdue(wo)) {
      reasons.push(`timeteller ${equipment?.usage_hours} av ${wo.due_hours} t`);
    } else if (wo.due_hours != null) {
      reasons.push(`ved ${wo.due_hours} t`);
    }
    return `<li><strong>${wo.title}</strong> — ${equipment?.name ?? 'Ukjent utstyr'} (${reasons.join(' · ')})</li>`;
  };

  const html = `
    <h2>Vedlikeholdspåminnelse — Gamletun</h2>
    ${overdue.length > 0 ? `<h3>Forfalt (${overdue.length})</h3><ul>${overdue.map(row).join('')}</ul>` : ''}
    ${dueSoon.length > 0 ? `<h3>Forfaller innen ${DUE_SOON_DAYS} dager (${dueSoon.length})</h3><ul>${dueSoon.map(row).join('')}</ul>` : ''}
    <p><a href="${origin}/work-orders">Åpne arbeidsordrer i Gamletun Vedlikehold</a></p>
  `;

  const ok = await sendEmail({
    to: notifyEmail,
    subject: `Vedlikehold: ${overdue.length} forfalt · ${dueSoon.length} forfaller snart`,
    html,
  });

  return NextResponse.json({
    expiredReservations: expiredEquipmentIds.length,
    sent: ok ? 1 : 0,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
  });
}
