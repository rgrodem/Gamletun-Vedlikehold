// Lager/utlån med antall per deltype — se migration 017.
import { createClient } from '@/lib/supabase/client';

export interface InventoryItem {
  id: string;
  equipment_id: string;
  name: string;
  total_quantity: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryLoan {
  id: string;
  inventory_item_id: string;
  borrower_name: string;
  quantity: number;
  status: 'active' | 'returned';
  note: string | null;
  loaned_at: string;
  returned_at: string | null;
  created_at: string;
}

export async function getInventoryItems(equipmentId: string): Promise<InventoryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
  return data || [];
}

// Aktive utlån for alle deltyper på ett utstyr.
export async function getActiveLoans(equipmentId: string): Promise<InventoryLoan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory_loans')
    .select('*, item:inventory_item_id!inner(equipment_id)')
    .eq('item.equipment_id', equipmentId)
    .eq('status', 'active')
    .order('loaned_at', { ascending: true });

  if (error) {
    console.error('Error fetching inventory loans:', error);
    throw error;
  }
  // Fjern det innebygde join-objektet; vi trenger bare lånerader.
  return (data || []).map(({ item: _item, ...loan }) => loan as InventoryLoan);
}

export async function addInventoryItem(
  equipmentId: string,
  name: string,
  totalQuantity: number
): Promise<InventoryItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ equipment_id: equipmentId, name, total_quantity: totalQuantity })
    .select()
    .single();

  if (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
  return data;
}

export async function updateInventoryItemTotal(
  itemId: string,
  totalQuantity: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inventory_items')
    .update({ total_quantity: totalQuantity, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
  if (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

export async function lendOut(
  itemId: string,
  borrowerName: string,
  quantity: number
): Promise<InventoryLoan> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inventory_loans')
    .insert({ inventory_item_id: itemId, borrower_name: borrowerName, quantity })
    .select()
    .single();

  if (error) {
    console.error('Error lending out:', error);
    throw error;
  }
  return data;
}

export async function returnLoan(loanId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inventory_loans')
    .update({ status: 'returned', returned_at: new Date().toISOString() })
    .eq('id', loanId);

  if (error) {
    console.error('Error returning loan:', error);
    throw error;
  }
}

// Sum aktive utlån per deltype.
export function loanedQuantity(loans: InventoryLoan[], itemId: string): number {
  return loans
    .filter((l) => l.inventory_item_id === itemId)
    .reduce((sum, l) => sum + l.quantity, 0);
}
