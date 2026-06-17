import type { SupabaseClient } from '@supabase/supabase-js';

export type EquipmentStatus = 'active' | 'maintenance' | 'inactive' | 'in_use';

type SupabaseRpcClient = Pick<SupabaseClient, 'rpc'>;

/**
 * Recompute one equipment's status from current work orders and reservations.
 *
 * The actual logic lives in the Postgres function `refresh_equipment_status`
 * (migration 020). It runs SECURITY DEFINER so members — who may report faults
 * and reserve equipment but cannot otherwise write to `equipment` — can still
 * trigger the derived status update. Keeping it in one place (the DB) also means
 * server and client paths can never drift.
 *
 * Priority: active non-low work -> maintenance; started reservation -> in_use;
 * manually inactive stays inactive; otherwise active.
 */
export async function refreshEquipmentStatusWithClient(
  supabase: SupabaseRpcClient,
  equipmentId: string
): Promise<EquipmentStatus> {
  const { data, error } = await supabase.rpc('refresh_equipment_status', {
    p_equipment_id: equipmentId,
  });

  if (error) {
    console.error('Error refreshing equipment status:', error);
    return 'active';
  }

  return (data as EquipmentStatus) || 'active';
}
