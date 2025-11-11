import { createClient } from '@/lib/supabase/server';
import InUseClient from '@/components/reservations/InUseClient';

export const metadata = {
  title: 'Utstyr i Bruk',
};

export default async function InUsePage() {
  const supabase = await createClient();

  // Fetch all active reservations
  const { data: reservations } = await supabase
    .from('equipment_reservations')
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, status, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .eq('status', 'active')
    .order('start_time', { ascending: true});

  return <InUseClient reservations={reservations || []} />;
}
