import { createClient } from '@/lib/supabase/client';
import {
  refreshEquipmentStatusWithClient,
  type EquipmentStatus,
} from './equipment-status-core';

export type { EquipmentStatus };

export async function refreshEquipmentStatus(equipmentId: string): Promise<EquipmentStatus> {
  const supabase = createClient();
  return refreshEquipmentStatusWithClient(supabase, equipmentId);
}
