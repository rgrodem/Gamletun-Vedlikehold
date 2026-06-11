import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyReservationsClient from '@/components/reservations/MyReservationsClient';

export const metadata = {
  title: 'Mine Reservasjoner',
};
export const dynamic = 'force-dynamic';

export default async function MyReservationsPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch reservations for current user
  const { data: reservations } = await supabase
    .from('equipment_reservations')
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .eq('user_id', user.id)
    .order('start_time', { ascending: false });

  // Varsle brukeren hvis utstyr de har reservert har fått meldt feil etterpå.
  // Lav-prioritet (kosmetiske) feil varsles ikke.
  const reservationData = reservations || [];
  const activeEquipmentIds = Array.from(
    new Set(
      reservationData
        .filter((r) => r.status === 'active')
        .map((r) => r.equipment_id as string)
    )
  );

  const faultsByEquipment: Record<string, string[]> = {};
  if (activeEquipmentIds.length > 0) {
    const { data: faults } = await supabase
      .from('work_orders')
      .select('equipment_id, title')
      .in('equipment_id', activeEquipmentIds)
      .eq('type', 'corrective')
      .neq('priority', 'low')
      .in('status', ['open', 'in_progress', 'waiting_parts']);

    (faults || []).forEach((fault) => {
      (faultsByEquipment[fault.equipment_id] ||= []).push(fault.title);
    });
  }

  return <MyReservationsClient reservations={reservationData} faultsByEquipment={faultsByEquipment} />;
}
