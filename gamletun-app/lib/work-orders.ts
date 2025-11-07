// Work Orders API functions
import { createClient } from '@/lib/supabase/client';

export type WorkOrderType = 'scheduled' | 'corrective' | 'inspection';
export type WorkOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'closed';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  task: string;
  completed: boolean;
}

export interface WorkOrder {
  id: string;
  equipment_id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  estimated_cost: number | null;
  actual_hours: number | null;
  actual_cost: number | null;
  due_date: string | null;
  scheduled_date: string | null;
  is_recurring: boolean;
  recurrence_interval_days: number | null;
  recurrence_interval_hours: number | null;
  next_due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_maintenance_log_id: string | null;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  closed_at: string | null;
  equipment?: {
    id: string;
    name: string;
  };
}

export interface WorkOrderComment {
  id: string;
  work_order_id: string;
  user_id: string | null;
  comment: string;
  status_change_from: string | null;
  status_change_to: string | null;
  created_at: string;
}

export interface CreateWorkOrderData {
  equipment_id: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  title: string;
  description?: string;
  estimated_hours?: number;
  estimated_cost?: number;
  due_date?: string;
  scheduled_date?: string;
  is_recurring?: boolean;
  recurrence_interval_days?: number;
  recurrence_interval_hours?: number;
  checklist?: ChecklistItem[];
}

/**
 * Get all work orders with optional filters
 */
export async function getWorkOrders(filters?: {
  equipment_id?: string;
  status?: WorkOrderStatus | WorkOrderStatus[];
  type?: WorkOrderType;
  priority?: WorkOrderPriority;
}): Promise<WorkOrder[]> {
  const supabase = createClient();

  let query = supabase
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (id, name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching work orders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get work orders that require attention
 */
export async function getWorkOrdersDashboard() {
  const supabase = createClient();
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Overdue
  const { data: overdue } = await supabase
    .from('work_orders')
    .select('id')
    .in('status', ['open', 'scheduled', 'in_progress'])
    .lt('due_date', today);

  // This week
  const { data: thisWeek } = await supabase
    .from('work_orders')
    .select('id')
    .in('status', ['open', 'scheduled', 'in_progress'])
    .gte('due_date', today)
    .lte('due_date', nextWeek);

  // Open faults
  const { data: openFaults } = await supabase
    .from('work_orders')
    .select('id')
    .eq('type', 'corrective')
    .in('status', ['open', 'in_progress']);

  // Scheduled
  const { data: scheduled } = await supabase
    .from('work_orders')
    .select('id')
    .eq('status', 'scheduled');

  return {
    overdue: overdue?.length || 0,
    thisWeek: thisWeek?.length || 0,
    openFaults: openFaults?.length || 0,
    scheduled: scheduled?.length || 0,
  };
}

/**
 * Get single work order by ID
 */
export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      equipment:equipment_id (id, name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching work order:', error);
    return null;
  }

  return data;
}

/**
 * Create a new work order
 */
export async function createWorkOrder(data: CreateWorkOrderData): Promise<WorkOrder> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Determine initial status based on type
  let status: WorkOrderStatus = 'open';
  if (data.type === 'scheduled' && data.scheduled_date) {
    status = 'scheduled';
  }

  const workOrderData = {
    ...data,
    status,
    created_by: user?.id || null,
    next_due_date: data.is_recurring ? data.due_date : null,
  };

  const { data: workOrder, error } = await supabase
    .from('work_orders')
    .insert(workOrderData)
    .select()
    .single();

  if (error) {
    console.error('Error creating work order:', error);
    throw error;
  }

  return workOrder;
}

/**
 * Update work order
 */
export async function updateWorkOrder(
  id: string,
  updates: Partial<WorkOrder>
): Promise<WorkOrder> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating work order:', error);
    throw error;
  }

  return data;
}

/**
 * Delete work order
 */
export async function deleteWorkOrder(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting work order:', error);
    throw error;
  }
}

/**
 * Complete work order and create maintenance log
 */
export async function completeWorkOrder(
  id: string,
  completionData: {
    comment?: string;
    actual_hours?: number;
    actual_cost?: number;
    checklist?: ChecklistItem[];
  }
): Promise<void> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get work order
  const workOrder = await getWorkOrder(id);
  if (!workOrder) throw new Error('Work order not found');

  // Create maintenance log
  const { data: maintenanceLog, error: logError } = await supabase
    .from('maintenance_logs')
    .insert({
      equipment_id: workOrder.equipment_id,
      description: `${workOrder.title}\n\n${completionData.comment || ''}`,
      performed_date: new Date().toISOString(),
      performed_by: user?.id || null,
    })
    .select()
    .single();

  if (logError) throw logError;

  // Update work order
  await updateWorkOrder(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_maintenance_log_id: maintenanceLog.id,
    actual_hours: completionData.actual_hours || null,
    actual_cost: completionData.actual_cost || null,
    checklist: completionData.checklist || workOrder.checklist,
  });

  // Add comment
  if (completionData.comment) {
    await addWorkOrderComment(id, completionData.comment, 'in_progress', 'completed');
  }

  // Handle recurring tasks
  if (workOrder.is_recurring && workOrder.recurrence_interval_days) {
    const nextDueDate = calculateNextDueDate(
      new Date(),
      workOrder.recurrence_interval_days
    );

    await createWorkOrder({
      equipment_id: workOrder.equipment_id,
      type: workOrder.type,
      priority: workOrder.priority,
      title: workOrder.title,
      description: workOrder.description || undefined,
      estimated_hours: workOrder.estimated_hours || undefined,
      estimated_cost: workOrder.estimated_cost || undefined,
      due_date: nextDueDate.toISOString(),
      is_recurring: true,
      recurrence_interval_days: workOrder.recurrence_interval_days,
      checklist: resetChecklist(workOrder.checklist),
    });
  }
}

/**
 * Add comment to work order
 */
export async function addWorkOrderComment(
  workOrderId: string,
  comment: string,
  statusFrom?: string,
  statusTo?: string
): Promise<WorkOrderComment> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('work_order_comments')
    .insert({
      work_order_id: workOrderId,
      user_id: user?.id || null,
      comment,
      status_change_from: statusFrom || null,
      status_change_to: statusTo || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  return data;
}

/**
 * Get comments for a work order
 */
export async function getWorkOrderComments(workOrderId: string): Promise<WorkOrderComment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_comments')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get count of open work orders for equipment
 */
export async function getOpenWorkOrdersCount(equipmentId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('equipment_id', equipmentId)
    .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts']);

  if (error) {
    console.error('Error counting work orders:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get count of open work orders grouped by equipment
 * Returns a map of equipment_id -> count
 */
export async function getOpenWorkOrderCountsByEquipment(): Promise<Record<string, number>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select('equipment_id')
    .in('status', ['open', 'scheduled', 'in_progress', 'waiting_parts']);

  if (error) {
    console.error('Error fetching work order counts:', error);
    return {};
  }

  // Count occurrences by equipment_id
  const counts: Record<string, number> = {};
  data?.forEach(wo => {
    counts[wo.equipment_id] = (counts[wo.equipment_id] || 0) + 1;
  });

  return counts;
}

// Helper functions

function calculateNextDueDate(fromDate: Date, intervalDays: number): Date {
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

function resetChecklist(checklist: ChecklistItem[]): ChecklistItem[] {
  return checklist.map(item => ({ ...item, completed: false }));
}

// Status and priority helpers
export const statusLabels: Record<WorkOrderStatus, string> = {
  open: 'Åpen',
  scheduled: 'Planlagt',
  in_progress: 'Pågår',
  waiting_parts: 'Venter deler',
  completed: 'Fullført',
  closed: 'Lukket',
};

export const statusColors: Record<WorkOrderStatus, string> = {
  open: 'bg-gray-100 text-gray-800 border-gray-300',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  waiting_parts: 'bg-orange-100 text-orange-800 border-orange-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const priorityLabels: Record<WorkOrderPriority, string> = {
  low: 'Lav',
  medium: 'Medium',
  high: 'Høy',
  urgent: 'Akutt',
};

export const priorityColors: Record<WorkOrderPriority, string> = {
  low: 'border-gray-300 text-gray-700',
  medium: 'border-blue-400 text-blue-700',
  high: 'border-orange-400 text-orange-700',
  urgent: 'border-red-500 text-red-700 animate-pulse',
};

export const typeLabels: Record<WorkOrderType, string> = {
  scheduled: 'Planlagt vedlikehold',
  corrective: 'Feilretting',
  inspection: 'Inspeksjon',
};

export const typeIcons: Record<WorkOrderType, string> = {
  scheduled: '🔧',
  corrective: '⚠️',
  inspection: '🔍',
};
