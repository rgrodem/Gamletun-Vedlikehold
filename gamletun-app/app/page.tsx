import { createClient } from '@/lib/supabase/server';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';
import AppLayout from '@/components/layout/AppLayout';
import { refreshEquipmentStatusWithClient } from '@/lib/equipment-status-core';
import { getOpenWorkOrderCountsByEquipment, getWorkOrdersDashboard } from '@/lib/work-orders';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();

  // Compute date ranges once before kicking off the parallel queries.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];
  const nowISO = new Date().toISOString();

  const { data: expiredReservations } = await supabase
    .from('equipment_reservations')
    .update({ status: 'completed', updated_at: nowISO })
    .eq('status', 'active')
    .not('end_time', 'is', null)
    .lte('end_time', nowISO)
    .select('equipment_id');

  const expiredEquipmentIds = Array.from(
    new Set((expiredReservations || []).map((reservation) => reservation.equipment_id))
  );
  await Promise.all(
    expiredEquipmentIds.map((equipmentId) => refreshEquipmentStatusWithClient(supabase, equipmentId))
  );

  // Run every independent fetch in parallel — they all hit the same Supabase
  // project so they share a single TCP/TLS connection and finish in roughly
  // the slowest query's time instead of summing.
  //
  // The "last maintenance per equipment" lookup is served by the
  // equipment_last_maintenance view (migration 008) which uses DISTINCT ON,
  // so we get one row per machine instead of every log row.
  const [
    userResult,
    categoriesResult,
    equipmentResult,
    reservationsResult,
    recentMaintenanceResult,
    lastMaintenanceResult,
    nextWorkOrdersResult,
    workOrderCounts,
    workOrderStats,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('equipment')
      .select(`
        *,
        category:categories(*)
      `)
      .order('name'),
    supabase
      .from('equipment_reservations')
      .select(`
        id,
        equipment_id,
        user_id,
        start_time,
        end_time,
        status,
        notes,
        user_profile:user_id(id, full_name)
      `)
      .eq('status', 'active')
      .or(`end_time.is.null,end_time.gt.${nowISO}`)
      .order('start_time', { ascending: true }),
    supabase
      .from('maintenance_logs')
      .select('id, equipment_id, performed_date')
      .gte('performed_date', thirtyDaysAgoISO),
    supabase
      .from('equipment_last_maintenance')
      .select('equipment_id, performed_date'),
    supabase
      .from('work_orders')
      .select('equipment_id, due_date, title')
      .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts'])
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true }),
    getOpenWorkOrderCountsByEquipment(),
    getWorkOrdersDashboard(),
  ]);

  const user = userResult.data.user;
  const categories = categoriesResult.data;
  const equipment = equipmentResult.data;
  const reservations = (reservationsResult.data || []).map((reservation) => ({
    ...reservation,
    user_profile: Array.isArray(reservation.user_profile)
      ? reservation.user_profile[0] || null
      : reservation.user_profile,
  }));
  const recentMaintenance = recentMaintenanceResult.data;
  const nextWorkOrdersData = nextWorkOrdersResult.data;

  // The view returns at most one row per equipment, so this is a simple map.
  const lastMaintenanceDates: Record<string, string> = {};
  lastMaintenanceResult.data?.forEach((log: { equipment_id: string; performed_date: string }) => {
    lastMaintenanceDates[log.equipment_id] = log.performed_date;
  });

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
        reservations={reservations}
        lastMaintenanceDates={lastMaintenanceDates}
        nextWorkOrders={nextWorkOrdersData || []}
      />
    </AppLayout>
  );
}
