import { createClient } from '@/lib/supabase/server';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';
import AppLayout from '@/components/layout/AppLayout';
import { getOpenWorkOrderCountsByEquipment, getWorkOrdersDashboard } from '@/lib/work-orders';

// Revalidate every 60 seconds instead of on every request
export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch categories from database
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  // Fetch equipment with their categories
  const { data: equipment } = await supabase
    .from('equipment')
    .select(`
      *,
      category:categories(*)
    `)
    .order('name');

  // Fetch maintenance logs from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentMaintenance } = await supabase
    .from('maintenance_logs')
    .select('id, equipment_id, performed_date')
    .gte('performed_date', thirtyDaysAgo.toISOString().split('T')[0]);

  // Fetch last maintenance date per equipment
  const { data: lastMaintenanceData } = await supabase
    .from('maintenance_logs')
    .select('equipment_id, performed_date')
    .order('performed_date', { ascending: false });

  // Create lookup for last maintenance date
  const lastMaintenanceDates: Record<string, string> = {};
  lastMaintenanceData?.forEach(log => {
    if (!lastMaintenanceDates[log.equipment_id]) {
      lastMaintenanceDates[log.equipment_id] = log.performed_date;
    }
  });

  // Fetch next scheduled work orders per equipment
  const today = new Date().toISOString();
  const { data: nextWorkOrdersData } = await supabase
    .from('work_orders')
    .select('equipment_id, due_date, title')
    .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts'])
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });

  // Fetch open work order counts and dashboard stats
  const [workOrderCounts, workOrderStats] = await Promise.all([
    getOpenWorkOrderCountsByEquipment(),
    getWorkOrdersDashboard(),
  ]);

  return (
    <AppLayout
      email={user?.email}
      workOrderStats={workOrderStats}
    >
      <EquipmentDashboard
        categories={categories || []}
        equipment={equipment || []}
        recentMaintenance={recentMaintenance || []}
        workOrderCounts={workOrderCounts}
        lastMaintenanceDates={lastMaintenanceDates}
        nextWorkOrders={nextWorkOrdersData || []}
      />
    </AppLayout>
  );
}
