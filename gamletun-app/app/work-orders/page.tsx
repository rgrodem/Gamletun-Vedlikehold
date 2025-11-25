import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import WorkOrderListWrapper from '@/components/work-orders/WorkOrderListWrapper';
import WorkOrderCalendar from '@/components/work-orders/WorkOrderCalendar';
import { getWorkOrdersDashboard } from '@/lib/work-orders';
import { FaList, FaCalendarAlt, FaFilter } from 'react-icons/fa';

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string; equipment?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get work order stats for sidebar
  const workOrderStats = await getWorkOrdersDashboard();

  // Build query based on filter
  let query = supabase
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (id, name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false });

  // Apply filters from URL
  const filter = params.filter;
  const equipmentId = params.equipment;
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }

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
    // Include both status='scheduled' AND any work order with future due_date
    query = query
      .in('status', ['open', 'scheduled'])
      .gte('due_date', today);
  } else if (filter === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (filter === 'completed') {
    query = query.in('status', ['completed', 'closed']);
  } else if (filter === 'all_open') {
    query = query.in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts']);
  }

  const { data: workOrders } = await query;

  // Get equipment name if filtering by equipment
  let equipmentName = '';
  if (equipmentId) {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('name')
      .eq('id', equipmentId)
      .single();
    equipmentName = equipment?.name || '';
  }

  const view = params.view || 'list';

  const filterLabels: Record<string, string> = {
    overdue: 'Forfalt',
    thisweek: 'Denne uken',
    faults: 'Åpne feil',
    scheduled: 'Planlagt',
    in_progress: 'Pågår',
    completed: 'Fullført',
    all_open: 'Alle åpne',
  };

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Arbeidsordrer</h1>
            <p className="text-sm text-gray-600 mt-1">
              {workOrders?.length || 0} {workOrders?.length === 1 ? 'ordre' : 'ordrer'}
              {filter && ` - ${filterLabels[filter] || filter}`}
              {equipmentName && ` for ${equipmentName}`}
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href={`/work-orders?${new URLSearchParams({ ...(filter && { filter }), ...(equipmentId && { equipment: equipmentId }), view: 'list' }).toString()}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaList />
              <span className="hidden sm:inline">Liste</span>
            </Link>
            <Link
              href={`/work-orders?${new URLSearchParams({ ...(filter && { filter }), ...(equipmentId && { equipment: equipmentId }), view: 'calendar' }).toString()}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaCalendarAlt />
              <span className="hidden sm:inline">Kalender</span>
            </Link>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/work-orders"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alle
          </Link>
          <Link
            href="/work-orders?filter=overdue"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'overdue' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Forfalt {workOrderStats.overdue > 0 && `(${workOrderStats.overdue})`}
          </Link>
          <Link
            href="/work-orders?filter=thisweek"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'thisweek' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            Denne uken {workOrderStats.thisWeek > 0 && `(${workOrderStats.thisWeek})`}
          </Link>
          <Link
            href="/work-orders?filter=faults"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'faults' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            Åpne feil {workOrderStats.openFaults > 0 && `(${workOrderStats.openFaults})`}
          </Link>
          <Link
            href="/work-orders?filter=scheduled"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'scheduled' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Planlagt {workOrderStats.scheduled > 0 && `(${workOrderStats.scheduled})`}
          </Link>
          <Link
            href="/work-orders?filter=in_progress"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'in_progress' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Pågår
          </Link>
          <Link
            href="/work-orders?filter=completed"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'completed' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Fullført
          </Link>
        </div>

        {/* Content */}
        {workOrders && workOrders.length > 0 ? (
          view === 'calendar' ? (
            <WorkOrderCalendar workOrders={workOrders as any[]} />
          ) : (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <WorkOrderListWrapper
                workOrders={workOrders as any[]}
                showEquipmentName={true}
              />
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Ingen arbeidsordrer funnet
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              {filter
                ? 'Prøv å endre filteret eller opprett nye arbeidsordrer'
                : 'Opprett din første arbeidsordre for å komme i gang'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Gå til utstyrsoversikt
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
