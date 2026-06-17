import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PartDetailClient from '@/components/parts/PartDetailClient';
import { getWorkOrdersDashboard } from '@/lib/work-orders';
import type { Part } from '@/lib/parts';

export const dynamic = 'force-dynamic';

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [userResult, partResult, equipmentResult, workOrderStats] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('parts').select('*').eq('id', id).single(),
    supabase.from('equipment').select('id, name').order('name', { ascending: true }),
    getWorkOrdersDashboard(supabase),
  ]);

  if (partResult.error || !partResult.data) notFound();

  return (
    <AppLayout email={userResult.data.user?.email} workOrderStats={workOrderStats}>
      <PartDetailClient
        part={partResult.data as Part}
        equipment={(equipmentResult.data || []) as { id: string; name: string }[]}
      />
    </AppLayout>
  );
}
