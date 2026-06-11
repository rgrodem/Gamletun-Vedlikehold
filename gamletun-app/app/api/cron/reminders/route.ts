// Daglig påminnelse på e-post om forfalt og snart forfallende vedlikehold.
// Kjøres av Vercel Cron (se vercel.json). Vercel sender automatisk
// "Authorization: Bearer <CRON_SECRET>" når miljøvariabelen CRON_SECRET er
// satt — uten gyldig hemmelighet avvises kallet.
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

const ACTIVE_STATUSES = ['open', 'scheduled', 'in_progress', 'waiting_parts'];
const DUE_SOON_DAYS = 7;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 });
  }

  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.warn('NOTIFY_EMAIL er ikke satt – påminnelse ikke sendt');
    return NextResponse.json({ sent: 0, skipped: 'notify_email_missing' });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.warn('SUPABASE_SERVICE_ROLE_KEY mangler – påminnelse ikke sendt');
    return NextResponse.json({ sent: 0, skipped: 'service_role_missing' });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const soonEnd = new Date(todayStart);
  soonEnd.setDate(soonEnd.getDate() + DUE_SOON_DAYS);
  soonEnd.setHours(23, 59, 59, 999);

  const { data, error } = await admin
    .from('work_orders')
    .select('id, title, type, priority, due_date, equipment:equipment_id (id, name)')
    .in('status', ACTIVE_STATUSES)
    .not('due_date', 'is', null)
    .lte('due_date', soonEnd.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Kunne ikke hente arbeidsordrer for påminnelse:', error);
    return NextResponse.json({ error: 'Databasefeil' }, { status: 500 });
  }

  const parseDue = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(value);
  };

  const all = data || [];
  const overdue = all.filter((wo) => parseDue(wo.due_date!) < todayStart);
  const dueSoon = all.filter((wo) => parseDue(wo.due_date!) >= todayStart);

  if (overdue.length === 0 && dueSoon.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 'nothing_due' });
  }

  const origin = new URL(request.url).origin;
  const row = (wo: (typeof all)[number]) => {
    const equipment = Array.isArray(wo.equipment) ? wo.equipment[0] : wo.equipment;
    const due = new Date(wo.due_date!).toLocaleDateString('nb-NO');
    return `<li><strong>${wo.title}</strong> — ${equipment?.name ?? 'Ukjent utstyr'} (frist ${due})</li>`;
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

  return NextResponse.json({ sent: ok ? 1 : 0, overdue: overdue.length, dueSoon: dueSoon.length });
}
