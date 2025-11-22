import { createClient } from '@/lib/supabase/server';
import ReservationsClient from '@/components/reservations/ReservationsClient';

export default async function ReservationsPage() {
  const supabase = await createClient();

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
      equipment!equipment_id (
        id,
        name,
        image_url
      )
    `)
    .order('start_time', { ascending: false });

  // Transform the data to match expected structure (equipment is returned as array by Supabase)
  const reservations = (rawReservations || []).map(r => ({
    ...r,
    equipment: Array.isArray(r.equipment) ? r.equipment[0] : r.equipment
  }));

  return <ReservationsClient initialReservations={reservations} />;
}
