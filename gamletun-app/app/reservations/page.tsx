import { createClient } from '@/lib/supabase/server';
import ReservationsClient from '@/components/reservations/ReservationsClient';

export default async function ReservationsPage() {
    const supabase = await createClient();

    // Fetch all reservations with equipment details
    const { data: reservations } = await supabase
        .from('reservations')
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

    return <ReservationsClient initialReservations={reservations || []} />;
}
