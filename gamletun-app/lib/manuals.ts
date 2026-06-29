// Manualer + RAG-søk (Fase 1 MVP — se migration 021).
import { createClient } from '@/lib/supabase/client';

export type ManualStatus = 'uploaded' | 'parsing' | 'ready' | 'failed';

export interface Manual {
  id: string;
  title: string;
  make: string | null;
  model: string | null;
  manual_type: string | null;
  language: string | null;
  file_path: string;
  page_count: number | null;
  status: ManualStatus;
  error: string | null;
  created_at: string;
}

export const MANUAL_TYPE_LABELS: Record<string, string> = {
  verksted: 'Verkstedmanual',
  service: 'Servicemanual',
  bruker: 'Bruksanvisning',
  deler: 'Delekatalog',
};

export const MANUAL_STATUS_LABELS: Record<ManualStatus, string> = {
  uploaded: 'Lastet opp',
  parsing: 'Indekserer…',
  ready: 'Klar for søk',
  failed: 'Feilet',
};

// Manualer knyttet til en maskin (nyeste først).
export async function getManualsForEquipment(equipmentId: string): Promise<Manual[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('manual_machines')
    .select('manual:manual_id(*)')
    .eq('equipment_id', equipmentId);
  if (error) {
    console.error('Error fetching manuals:', error);
    throw error;
  }
  const manuals = (data || [])
    .map((row) => (Array.isArray(row.manual) ? row.manual[0] : row.manual))
    .filter(Boolean) as Manual[];
  return manuals.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// Opprett manual-rad + knytt til maskinen. Filen må være lastet opp på forhånd.
export async function createManual(params: {
  equipmentId: string;
  title: string;
  filePath: string;
  manualType?: string;
  make?: string | null;
  model?: string | null;
}): Promise<Manual> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: manual, error } = await supabase
    .from('manuals')
    .insert({
      title: params.title,
      file_path: params.filePath,
      manual_type: params.manualType || 'verksted',
      make: params.make ?? null,
      model: params.model ?? null,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error('Error creating manual:', error);
    throw error;
  }
  const { error: linkErr } = await supabase
    .from('manual_machines')
    .insert({ manual_id: manual.id, equipment_id: params.equipmentId });
  if (linkErr) {
    console.error('Error linking manual to equipment:', linkErr);
    throw linkErr;
  }
  return manual as Manual;
}

export async function deleteManual(manualId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('manuals').delete().eq('id', manualId);
  if (error) {
    console.error('Error deleting manual:', error);
    throw error;
  }
}
