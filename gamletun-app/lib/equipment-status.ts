import { createClient } from '@/lib/supabase/client';

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive' | 'in_use';

/**
 * Calculates and updates the status of a piece of equipment based on its active work orders
 * AND active reservations.
 *
 * Priority Rules (highest to lowest):
 * 1. If there are any work orders with status 'in_progress' or 'waiting_parts' → 'maintenance'
 * 2. If there are any active reservations that have started → 'in_use'
 * 3. If manually set to 'inactive' → keep 'inactive'
 * 4. Otherwise → 'active'
 *
 * @param equipmentId The ID of the equipment to update
 * @returns The new status
 */
export async function refreshEquipmentStatus(equipmentId: string): Promise<EquipmentStatus> {
  const supabase = createClient();

  // Get current equipment status
  const { data: currentEquipment } = await supabase
    .from('equipment')
    .select('status')
    .eq('id', equipmentId)
    .single();

  // Check for active work orders that should block the equipment (highest priority)
  const { data: activeWorkOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id, status, type')
    .eq('equipment_id', equipmentId)
    .in('status', ['in_progress', 'waiting_parts']);

  if (woError) {
    console.error('Error checking active work orders:', woError);
    return (currentEquipment?.status as EquipmentStatus) || 'active';
  }

  // If there are active work orders, equipment is under maintenance
  if (activeWorkOrders && activeWorkOrders.length > 0) {
    await supabase
      .from('equipment')
      .update({ status: 'maintenance' })
      .eq('id', equipmentId);
    return 'maintenance';
  }

  // Check for active reservations that have started
  const now = new Date().toISOString();
  const { data: activeReservations, error: resError } = await supabase
    .from('equipment_reservations')
    .select('id')
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .lte('start_time', now)
    .or(`end_time.is.null,end_time.gt.${now}`);

  if (resError) {
    console.error('Error checking active reservations:', resError);
    return (currentEquipment?.status as EquipmentStatus) || 'active';
  }

  // If there are active reservations, equipment is in use
  if (activeReservations && activeReservations.length > 0) {
    await supabase
      .from('equipment')
      .update({ status: 'in_use' })
      .eq('id', equipmentId);
    return 'in_use';
  }

  // Determine final status
  let newStatus: EquipmentStatus = 'active';

  // Respect manual 'inactive' status if no work/reservations
  if (currentEquipment?.status === 'inactive') {
    newStatus = 'inactive';
  }

  await supabase
    .from('equipment')
    .update({ status: newStatus })
    .eq('id', equipmentId);

  return newStatus;
}
