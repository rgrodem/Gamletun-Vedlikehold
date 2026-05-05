import type { SupabaseClient } from '@supabase/supabase-js';

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive' | 'in_use';

type SupabaseStatusClient = Pick<SupabaseClient, 'from'>;

/**
 * Recalculate one equipment status from current work orders and reservations.
 *
 * Priority:
 * 1. Active work in progress / waiting for parts -> maintenance
 * 2. Active reservation that has started -> in_use
 * 3. Manually inactive equipment stays inactive
 * 4. Otherwise active
 */
export async function refreshEquipmentStatusWithClient(
  supabase: SupabaseStatusClient,
  equipmentId: string
): Promise<EquipmentStatus> {
  const { data: currentEquipment } = await supabase
    .from('equipment')
    .select('status')
    .eq('id', equipmentId)
    .single();

  const { data: activeWorkOrders, error: workOrderError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('equipment_id', equipmentId)
    .in('status', ['in_progress', 'waiting_parts']);

  if (workOrderError) {
    console.error('Error checking active work orders:', workOrderError);
    return (currentEquipment?.status as EquipmentStatus) || 'active';
  }

  if (activeWorkOrders && activeWorkOrders.length > 0) {
    await supabase
      .from('equipment')
      .update({ status: 'maintenance' })
      .eq('id', equipmentId);
    return 'maintenance';
  }

  const now = new Date().toISOString();
  const { data: activeReservations, error: reservationError } = await supabase
    .from('equipment_reservations')
    .select('id')
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .lte('start_time', now)
    .or(`end_time.is.null,end_time.gt.${now}`);

  if (reservationError) {
    console.error('Error checking active reservations:', reservationError);
    return (currentEquipment?.status as EquipmentStatus) || 'active';
  }

  if (activeReservations && activeReservations.length > 0) {
    await supabase
      .from('equipment')
      .update({ status: 'in_use' })
      .eq('id', equipmentId);
    return 'in_use';
  }

  const newStatus: EquipmentStatus = currentEquipment?.status === 'inactive' ? 'inactive' : 'active';

  await supabase
    .from('equipment')
    .update({ status: newStatus })
    .eq('id', equipmentId);

  return newStatus;
}
