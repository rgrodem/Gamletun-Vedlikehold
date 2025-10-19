import { createClient } from '@/lib/supabase/server';
import ReportClient from '@/components/reports/ReportClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();

  // Fetch all equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, category:categories(name)')
    .order('name');

  // Fetch all maintenance types
  const { data: maintenanceTypes } = await supabase
    .from('maintenance_types')
    .select('*')
    .order('type_name');

  // Get current month's data by default
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      equipment:equipment(name, category:categories(name)),
      maintenance_type:maintenance_types(type_name)
    `)
    .gte('performed_date', firstDayOfMonth.toISOString().split('T')[0])
    .lte('performed_date', lastDayOfMonth.toISOString().split('T')[0])
    .order('performed_date', { ascending: false });

  return (
    <ReportClient
      equipment={equipment || []}
      maintenanceTypes={maintenanceTypes || []}
      initialLogs={maintenanceLogs || []}
      initialStartDate={firstDayOfMonth.toISOString().split('T')[0]}
      initialEndDate={lastDayOfMonth.toISOString().split('T')[0]}
    />
  );
}
