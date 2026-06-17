// Reservedels-/varelager — se migration 019.
import { createClient } from '@/lib/supabase/client';

export type PartType = 'consumable' | 'equipment_specific';
export type PartUnit = 'stk' | 'liter' | 'meter' | 'kg';
export type MovementType = 'in' | 'out' | 'correction' | 'return';

export interface Part {
  id: string;
  name: string;
  part_number: string | null;
  ean: string | null;
  description: string | null;
  category: string | null;
  part_type: PartType;
  unit: PartUnit;
  location: string | null;
  min_stock: number;
  current_stock: number;
  unit_cost: number | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  part_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  work_order_id: string | null;
  maintenance_log_id: string | null;
  equipment_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export const UNIT_LABELS: Record<PartUnit, string> = {
  stk: 'stk',
  liter: 'liter',
  meter: 'meter',
  kg: 'kg',
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  in: 'Innkjøp',
  out: 'Forbruk',
  correction: 'Korreksjon',
  return: 'Retur',
};

export interface CreatePartData {
  name: string;
  part_number?: string | null;
  ean?: string | null;
  category?: string | null;
  part_type: PartType;
  unit: PartUnit;
  location?: string | null;
  min_stock?: number;
  unit_cost?: number | null;
  notes?: string | null;
}

export async function getParts(filters?: {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}): Promise<Part[]> {
  const supabase = createClient();
  let query = supabase.from('parts').select('*').order('name', { ascending: true });

  if (filters?.search) {
    const s = `%${filters.search}%`;
    query = query.or(`name.ilike.${s},part_number.ilike.${s},ean.ilike.${s}`);
  }
  if (filters?.category) query = query.eq('category', filters.category);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching parts:', error);
    throw error;
  }
  let parts = data || [];
  if (filters?.lowStockOnly) {
    parts = parts.filter((p) => p.min_stock > 0 && p.current_stock <= p.min_stock);
  }
  return parts;
}

export async function getPart(id: string): Promise<Part | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('parts').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching part:', error);
    throw error;
  }
  return data;
}

export async function createPart(data: CreatePartData): Promise<Part> {
  const supabase = createClient();
  const { data: part, error } = await supabase
    .from('parts')
    .insert({
      name: data.name,
      part_number: data.part_number || null,
      ean: data.ean || null,
      category: data.category || null,
      part_type: data.part_type,
      unit: data.unit,
      location: data.location || null,
      min_stock: data.min_stock ?? 0,
      unit_cost: data.unit_cost ?? null,
      notes: data.notes || null,
    })
    .select()
    .single();
  if (error) {
    console.error('Error creating part:', error);
    throw error;
  }
  return part;
}

export async function updatePart(id: string, data: Partial<CreatePartData>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('parts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('Error updating part:', error);
    throw error;
  }
}

export async function deletePart(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting part:', error);
    throw error;
  }
}

// Hvilke utstyr passer denne delen til.
export async function getPartCompatibility(partId: string): Promise<{ equipment_id: string; name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('part_equipment_compat')
    .select('equipment_id, equipment:equipment_id(name)')
    .eq('part_id', partId);
  if (error) {
    console.error('Error fetching compatibility:', error);
    throw error;
  }
  return (data || []).map((row) => {
    const eq = Array.isArray(row.equipment) ? row.equipment[0] : row.equipment;
    return { equipment_id: row.equipment_id as string, name: (eq?.name as string) || 'Ukjent' };
  });
}

// Erstatt kompatibilitetslisten for en del.
export async function setPartCompatibility(partId: string, equipmentIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from('part_equipment_compat').delete().eq('part_id', partId);
  if (equipmentIds.length > 0) {
    const { error } = await supabase
      .from('part_equipment_compat')
      .insert(equipmentIds.map((equipment_id) => ({ part_id: partId, equipment_id })));
    if (error) {
      console.error('Error setting compatibility:', error);
      throw error;
    }
  }
}

// Deler som passer et utstyr (forbruksmateriell + utstyrsspesifikke knyttet hit).
export async function getPartsForEquipment(equipmentId: string): Promise<Part[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('part_equipment_compat')
    .select('part:part_id(*)')
    .eq('equipment_id', equipmentId);
  if (error) {
    console.error('Error fetching parts for equipment:', error);
    throw error;
  }
  return (data || [])
    .map((row) => (Array.isArray(row.part) ? row.part[0] : row.part))
    .filter(Boolean) as Part[];
}

// Deler som kan velges som forbruk på en arbeidsordre: alt forbruksmateriell
// (felles, f.eks. olje) + utstyrsspesifikke deler knyttet til dette utstyret.
// Slik slipper man å scrolle gjennom filtre som hører til helt andre maskiner.
export async function getSelectablePartsForWorkOrder(equipmentId: string | null): Promise<Part[]> {
  const supabase = createClient();
  const { data: consumables, error } = await supabase
    .from('parts')
    .select('*')
    .eq('part_type', 'consumable')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching consumables:', error);
    throw error;
  }
  const byId = new Map<string, Part>();
  (consumables || []).forEach((p) => byId.set(p.id, p));
  if (equipmentId) {
    const specific = await getPartsForEquipment(equipmentId);
    specific.forEach((p) => byId.set(p.id, p));
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

// Forbruk (og retur) registrert på én arbeidsordre, med delenavn/enhet for visning.
export interface WorkOrderStockUsage extends StockMovement {
  part: Pick<Part, 'id' | 'name' | 'unit'> | null;
}

export async function getWorkOrderStockUsage(workOrderId: string): Promise<WorkOrderStockUsage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, part:part_id(id, name, unit)')
    .eq('work_order_id', workOrderId)
    .in('movement_type', ['out', 'return'])
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching work order stock usage:', error);
    throw error;
  }
  return (data || []).map((row) => {
    const part = Array.isArray(row.part) ? row.part[0] : row.part;
    return { ...row, part: part ?? null } as WorkOrderStockUsage;
  });
}

// Slett en lagerbevegelse (angre forbruk). Trigger oppdaterer beholdningen.
export async function deleteMovement(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('stock_movements').delete().eq('id', id);
  if (error) {
    console.error('Error deleting movement:', error);
    throw error;
  }
}

export async function getPartMovements(partId: string): Promise<StockMovement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('part_id', partId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('Error fetching movements:', error);
    throw error;
  }
  return data || [];
}

export async function addMovement(params: {
  partId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number | null;
  workOrderId?: string | null;
  maintenanceLogId?: string | null;
  equipmentId?: string | null;
  notes?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('stock_movements').insert({
    part_id: params.partId,
    movement_type: params.type,
    quantity: params.quantity,
    unit_cost: params.unitCost ?? null,
    work_order_id: params.workOrderId ?? null,
    maintenance_log_id: params.maintenanceLogId ?? null,
    equipment_id: params.equipmentId ?? null,
    performed_by: user?.id ?? null,
    notes: params.notes ?? null,
  });
  if (error) {
    console.error('Error adding stock movement:', error);
    throw error;
  }
  // Oppdater siste innkjøpspris på delen ved innkjøp.
  if (params.type === 'in' && params.unitCost != null) {
    await supabase.from('parts').update({ unit_cost: params.unitCost }).eq('id', params.partId);
  }
}

export function isLowStock(part: Pick<Part, 'min_stock' | 'current_stock'>): boolean {
  return part.min_stock > 0 && part.current_stock <= part.min_stock;
}
