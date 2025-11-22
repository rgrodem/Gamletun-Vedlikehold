import { createClient } from '@/lib/supabase/client';

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive';

/**
 * Calculates and updates the status of a piece of equipment based on its active work orders.
 * 
 * Rules:
 * 1. If there are any work orders with status 'in_progress', the equipment is 'maintenance'.
 * 2. If there are any work orders with status 'waiting_parts', the equipment is 'maintenance'.
 * 3. Scheduled work orders (future) do NOT affect status until they become 'in_progress'.
 * 4. If no active work orders (in_progress/waiting_parts), status should be 'active' (unless manually set to inactive).
 * 
 * @param equipmentId The ID of the equipment to update
 * @returns The new status
 */
export async function refreshEquipmentStatus(equipmentId: string): Promise<EquipmentStatus> {
  const supabase = createClient();

  // Check for active work orders that should block the equipment
  const { data: activeWorkOrders, error } = await supabase
    .from('work_orders')
    .select('id, status, type')
    .eq('equipment_id', equipmentId)
    .in('status', ['in_progress', 'waiting_parts']);

  if (error) {
    console.error('Error checking active work orders:', error);
    // Fallback: don't change status if we can't check
    return 'active'; 
  }

  let newStatus: EquipmentStatus = 'active';

  if (activeWorkOrders && activeWorkOrders.length > 0) {
    newStatus = 'maintenance';
  }

  // Update the equipment status in the database
  // Note: We only update if it's different to avoid unnecessary writes/triggers, 
  // but for simplicity here we'll just update. 
  // Ideally we should fetch current status first or use a stored procedure.
  
  // However, we need to be careful not to overwrite a manually set 'inactive' status 
  // if there are no work orders. 
  // But the requirement says "status goes in a logical state after change".
  // If a user manually sets 'inactive', and then a work order starts, it should probably go to 'maintenance'.
  // If the work order finishes, should it go back to 'inactive' or 'active'?
  // For now, let's assume 'active' is the default state when no work is being done.
  
  // Let's get the current status to respect manual 'inactive' if no work is being done
  const { data: currentEquipment } = await supabase
    .from('equipment')
    .select('status')
    .eq('id', equipmentId)
    .single();

  if (currentEquipment) {
    // If currently inactive and no work is being done, keep it inactive
    if (currentEquipment.status === 'inactive' && newStatus === 'active') {
      newStatus = 'inactive';
    }
  }

  await supabase
    .from('equipment')
    .update({ status: newStatus })
    .eq('id', equipmentId);

  return newStatus;
}
