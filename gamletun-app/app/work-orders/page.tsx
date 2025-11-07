import { FaTractor } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import UserMenu from '@/components/auth/UserMenu';
import WorkOrderList from '@/components/work-orders/WorkOrderList';
import { WorkOrder } from '@/lib/work-orders';

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build query based on filter
  let query = supabase
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (id, name)
    `)
    .order('created_at', { ascending: false });

  // Apply filters from URL
  const filter = params.filter;
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (filter === 'overdue') {
    query = query
      .in('status', ['open', 'scheduled', 'in_progress'])
      .lt('due_date', today);
  } else if (filter === 'thisweek') {
    query = query
      .in('status', ['open', 'scheduled', 'in_progress'])
      .gte('due_date', today)
      .lte('due_date', nextWeek);
  } else if (filter === 'faults') {
    query = query
      .eq('type', 'corrective')
      .in('status', ['open', 'in_progress']);
  } else if (filter === 'scheduled') {
    query = query.eq('status', 'scheduled');
  } else if (filter === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (filter === 'completed') {
    query = query.in('status', ['completed', 'closed']);
  }

  const { data: workOrders } = await query;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 sm:p-2.5 rounded-xl shadow-lg">
                <FaTractor className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Gamletun Vedlikehold
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Arbeidsordre</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {user && <UserMenu email={user.email || ''} />}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Arbeidsordre
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {workOrders?.length || 0} {workOrders?.length === 1 ? 'ordre' : 'ordrer'} funnet
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm touch-manipulation min-h-[40px] flex items-center"
            >
              Tilbake til dashboard
            </Link>
          </div>
        </div>

        {workOrders && workOrders.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
            <WorkOrderList
              workOrders={workOrders as WorkOrder[]}
              showEquipmentName={true}
              onStatusChange={() => {}}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ingen arbeidsordre funnet
            </h3>
            <p className="text-gray-600 mb-6">
              {filter
                ? 'Prøv å endre filteret eller opprett nye arbeidsordre'
                : 'Opprett din første arbeidsordre for å komme i gang'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              Gå til utstyrsoversikt
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white/50 backdrop-blur-sm border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600">© 2025 Gamletun. Alle rettigheter reservert.</p>
          <p className="text-xs text-gray-500 mt-1">www.gamletun.no</p>
        </div>
      </footer>
    </div>
  );
}
