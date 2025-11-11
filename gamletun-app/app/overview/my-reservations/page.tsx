import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyReservationsClient from '@/components/reservations/MyReservationsClient';

export const metadata = {
  title: 'Mine Reservasjoner',
};

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

  return <MyReservationsClient reservations={reservations || []} />;
}
