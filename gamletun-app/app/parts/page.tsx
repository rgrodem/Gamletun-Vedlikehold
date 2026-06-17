import { createClient } from '@/lib/supabase/server';
import AppLayout from '@/components/layout/AppLayout';
import PartsClient from '@/components/parts/PartsClient';
import { getWorkOrdersDashboard } from '@/lib/work-orders';
import type { Part } from '@/lib/parts';

export const dynamic = 'force-dynamic';

export default async function PartsPage() {
  const supabase = await createClient();

  const [userResult, partsResult, equipmentResult, workOrderStats] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('parts').select('*').order('name', { ascending: true }),
    supabase.from('equipment').select('id, name').order('name', { ascending: true }),
    getWorkOrdersDashboard(supabase),
  ]);

  const user = userResult.data.user;
  const parts = (partsResult.data || []) as Part[];
  const equipment = (equipmentResult.data || []) as { id: string; name: string }[];

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      <PartsClient initialParts={parts} equipment={equipment} />
    </AppLayout>
  );
}
