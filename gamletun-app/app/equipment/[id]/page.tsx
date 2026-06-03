import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EquipmentDetailClient from '@/components/equipment/EquipmentDetailClient';
import AppLayout from '@/components/layout/AppLayout';
import { getWorkOrdersDashboard } from '@/lib/work-orders';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // These queries are independent — run them in one round trip instead of
  // five sequential awaits (each was a separate hop to Supabase eu-west-1).
  const [
    userResult,
    workOrderStats,
    equipmentResult,
    maintenanceLogsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getWorkOrdersDashboard(supabase),
    supabase.from('equipment').select('*, category:categories(*)').eq('id', id).single(),
    supabase
      .from('maintenance_logs')
      .select(`
        *,
        maintenance_type:maintenance_types(type_name),
        performed_by_profile:performed_by(id, full_name)
      `)
      .eq('equipment_id', id)
      .order('performed_date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
  ]);

  const user = userResult.data.user;
  const { data: equipment, error: equipmentError } = equipmentResult;
  const { data: maintenanceLogs } = maintenanceLogsResult;
  const { data: categories } = categoriesResult;

  if (equipmentError || !equipment) {
    notFound();
  }

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      <EquipmentDetailClient
        equipment={equipment}
        maintenanceLogs={maintenanceLogs || []}
        categories={categories || []}
      />
    </AppLayout>
  );
}
