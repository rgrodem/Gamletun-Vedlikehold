// Deleliste på arbeidsordrer — se migration 012.
import { createClient } from '@/lib/supabase/client';

export type PartStatus = 'needed' | 'ordered' | 'received';

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  name: string;
  quantity: number;
  status: PartStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export const partStatusLabels: Record<PartStatus, string> = {
  needed: 'Trengs',
  ordered: 'Bestilt',
  received: 'Mottatt',
};

// Trykk på status-chipen ruller videre til neste steg.
export const nextPartStatus: Record<PartStatus, PartStatus> = {
  needed: 'ordered',
  ordered: 'received',
  received: 'needed',
};

export async function getWorkOrderParts(workOrderId: string): Promise<WorkOrderPart[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_parts')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching work order parts:', error);
    throw error;
  }

  return data || [];
}

export async function addWorkOrderPart(
  workOrderId: string,
  name: string,
  quantity: number
): Promise<WorkOrderPart> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_parts')
    .insert({ work_order_id: workOrderId, name, quantity })
    .select()
    .single();

  if (error) {
    console.error('Error adding work order part:', error);
    throw error;
  }

  return data;
}

export async function updateWorkOrderPartStatus(
  partId: string,
  status: PartStatus
): Promise<WorkOrderPart> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_parts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', partId)
    .select()
    .single();

  if (error) {
    console.error('Error updating work order part:', error);
    throw error;
  }

  return data;
}

export async function deleteWorkOrderPart(partId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('work_order_parts')
    .delete()
    .eq('id', partId);

  if (error) {
    console.error('Error deleting work order part:', error);
    throw error;
  }
}
