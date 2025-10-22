import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EquipmentDetailClient from '@/components/equipment/EquipmentDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch equipment details
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (equipmentError || !equipment) {
    notFound();
  }

  // Fetch maintenance logs
  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select('*, maintenance_type:maintenance_types(type_name)')
    .eq('equipment_id', id)
    .order('performed_date', { ascending: false });

  // Fetch all categories for editing
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  return (
    <EquipmentDetailClient
      equipment={equipment}
      maintenanceLogs={maintenanceLogs || []}
      categories={categories || []}
    />
  );
}
