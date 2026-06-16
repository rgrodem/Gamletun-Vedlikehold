import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import WorkOrderListWrapper from '@/components/work-orders/WorkOrderListWrapper';
import WorkOrderCalendar from '@/components/work-orders/WorkOrderCalendar';
import WeatherWidget from '@/components/work-orders/WeatherWidget';
import PushToggle from '@/components/PushToggle';
import { getWorkOrdersDashboard, type WorkOrder } from '@/lib/work-orders';
import { FaList, FaCalendarAlt } from 'react-icons/fa';

export const dynamic = 'force-dynamic';

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string; equipment?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const filter = params.filter;
  const equipmentId = params.equipment;
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (id, name, usage_hours)
    `)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (equipmentId) query = query.eq('equipment_id', equipmentId);

  if (filter === 'overdue') {
    query = query
      .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts'])
      .lt('due_date', today);
  } else if (filter === 'thisweek') {
    query = query
      .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts'])
      .gte('due_date', today)
      .lte('due_date', nextWeek);
  } else if (filter === 'faults') {
    query = query
      .eq('type', 'corrective')
      .in('status', ['open', 'in_progress', 'waiting_parts']);
  } else if (filter === 'scheduled') {
    query = query.in('status', ['open', 'scheduled']).gte('due_date', today);
  } else if (filter === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (filter === 'completed') {
    query = query.in('status', ['completed', 'closed']);
  } else if (filter === 'all_open') {
    query = query.in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts']);
  }

  // user, dashboard, the (filtered) work-order list and the optional equipment
  // name are all independent — fetch them in one parallel round trip.
  const [userResult, workOrderStats, workOrdersResult, equipmentNameResult] = await Promise.all([
    supabase.auth.getUser(),
    getWorkOrdersDashboard(supabase),
    query,
    equipmentId
      ? supabase.from('equipment').select('name').eq('id', equipmentId).single()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const user = userResult.data.user;
  const typedWorkOrders = (workOrdersResult.data || []) as WorkOrder[];
  const equipmentName = equipmentNameResult.data?.name || '';

  const view = params.view || 'list';
  const openCount = workOrderStats.openTotal;

  const chips = [
    { key: undefined, label: `Alle · ${typedWorkOrders.length}` },
    { key: 'overdue', label: `Forfalt · ${workOrderStats.overdue}` },
    { key: 'thisweek', label: `Denne uken · ${workOrderStats.thisWeek}` },
    { key: 'faults', label: `Åpne feil · ${workOrderStats.openFaults}` },
    { key: 'scheduled', label: `Planlagt · ${workOrderStats.scheduled}` },
    { key: 'in_progress', label: 'Pågår' },
    { key: 'completed', label: 'Fullført' },
  ];

  const queryBase = (k?: string) => {
    const sp = new URLSearchParams();
    if (k) sp.set('filter', k);
    if (equipmentId) sp.set('equipment', equipmentId);
    return sp.toString() ? `?${sp.toString()}` : '';
  };

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-[28px] font-medium text-ink tracking-tight2 m-0 leading-tight">
              Arbeidsordrer
            </h1>
            <p className="text-[14px] text-ink2 m-0 mt-0.5">
              {openCount} åpne · {workOrderStats.overdue} forfalt
              {equipmentName && ` · ${equipmentName}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/work-orders?${new URLSearchParams({ ...(filter && { filter }), ...(equipmentId && { equipment: equipmentId }), view: 'list' }).toString()}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-ink text-paper' : 'bg-paper text-ink border border-line'
              }`}
              aria-label="Listevisning"
            >
              <FaList />
            </Link>
            <Link
              href={`/work-orders?${new URLSearchParams({ ...(filter && { filter }), ...(equipmentId && { equipment: equipmentId }), view: 'calendar' }).toString()}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm font-medium transition-colors ${
                view === 'calendar' ? 'bg-ink text-paper' : 'bg-paper text-ink border border-line'
              }`}
              aria-label="Kalendervisning"
            >
              <FaCalendarAlt />
            </Link>
          </div>
        </div>

        {/* Værvarsel for planlegging av utendørs vedlikehold */}
        <WeatherWidget />

        {/* Tilbud om å slå på push-varsler (skjuler seg hvis allerede på/ikke støttet) */}
        <PushToggle />

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-0.5">
          {chips.map((c) => {
            const active = (c.key ?? '') === (filter ?? '');
            return (
              <Link
                key={c.label}
                href={`/work-orders${queryBase(c.key)}`}
                className={`flex-shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium ${
                  active ? 'bg-ink text-paper' : 'bg-paper text-ink border border-line'
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* Content */}
        {typedWorkOrders.length > 0 ? (
          view === 'calendar' ? (
            <WorkOrderCalendar workOrders={typedWorkOrders} />
          ) : (
            <WorkOrderListWrapper
              workOrders={typedWorkOrders}
              showEquipmentName={true}
              showFilters={false}
            />
          )
        ) : (
          <div className="bg-paper border border-line rounded-[18px] p-10 text-center">
            <h3 className="font-serif text-[20px] font-medium text-ink mb-2">
              Ingen arbeidsordrer
            </h3>
            <p className="text-ink2 mb-5 text-sm">
              {filter ? 'Prøv å endre filteret.' : 'Opprett din første arbeidsordre for å komme i gang.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[14px] font-medium text-sm"
            >
              Gå til utstyrsoversikt
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
