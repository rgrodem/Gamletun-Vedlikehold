import { createClient } from '@/lib/supabase/server';
import ReservationsClient from '@/components/reservations/ReservationsClient';
import AppLayout from '@/components/layout/AppLayout';
import { getWorkOrdersDashboard } from '@/lib/work-orders';

export default async function ReservationsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get work order stats for sidebar
  const workOrderStats = await getWorkOrdersDashboard();

  // Fetch all reservations with equipment details
  const { data: rawReservations } = await supabase
    .from('equipment_reservations')
    .select(`
      id,
      equipment_id,
      start_time,
      end_time,
      user_id,
      notes,
      status,
      equipment!equipment_id (
        id,
        name,
        image_url
      ),
      user_profile:user_id (
        id,
        full_name
      )
    `)
    .order('start_time', { ascending: false });

  // Transform the data to match expected structure (equipment is returned as array by Supabase)
  const reservations = (rawReservations || []).map(r => ({
    ...r,
    equipment: Array.isArray(r.equipment) ? r.equipment[0] : r.equipment,
    user_profile: Array.isArray(r.user_profile) ? r.user_profile[0] : r.user_profile
  }));

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      <ReservationsClient initialReservations={reservations} />
    </AppLayout>
  );
}
