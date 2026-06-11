// Bildevedlegg på arbeidsordrer (f.eks. foto av en meldt feil).
// Filene lagres i storage-bucketen 'maintenance-attachments' under
// work-orders/<work_order_id>/ — se migration 011.
import { createClient } from '@/lib/supabase/client';
import { uploadFile } from '@/lib/storage';

export interface WorkOrderAttachment {
  id: string;
  work_order_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  url?: string;
}

export async function getWorkOrderAttachments(workOrderId: string): Promise<WorkOrderAttachment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_attachments')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching work order attachments:', error);
    throw error;
  }

  return (data || []).map((attachment) => ({
    ...attachment,
    url: supabase.storage
      .from('maintenance-attachments')
      .getPublicUrl(attachment.file_path).data.publicUrl,
  }));
}

export async function uploadWorkOrderAttachment(
  workOrderId: string,
  file: File
): Promise<WorkOrderAttachment> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await uploadFile('maintenance-attachments', file, `work-orders/${workOrderId}`);

  const { data, error } = await supabase
    .from('work_order_attachments')
    .insert({
      work_order_id: workOrderId,
      file_name: file.name,
      file_path: result.path,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving work order attachment:', error);
    throw error;
  }

  return { ...data, url: result.url };
}

export async function deleteWorkOrderAttachment(attachment: WorkOrderAttachment): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('work_order_attachments')
    .delete()
    .eq('id', attachment.id);

  if (error) {
    console.error('Error deleting work order attachment:', error);
    throw error;
  }

  // Best effort: fjern selve filen også. Raden er allerede borte, så en
  // feilet sletting i storage skal ikke stoppe brukeren.
  const { error: storageError } = await supabase.storage
    .from('maintenance-attachments')
    .remove([attachment.file_path]);
  if (storageError) {
    console.error('Error deleting attachment file from storage:', storageError);
  }
}
