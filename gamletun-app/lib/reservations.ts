// Equipment Reservations API functions
import { createClient } from '@/lib/supabase/client';
import { refreshEquipmentStatus } from '@/lib/equipment-status';

export type ReservationStatus = 'active' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  equipment_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  equipment?: {
    id: string;
    name: string;
    model: string | null;
    image_url: string | null;
    category?: {
      name: string;
      icon: string;
      color: string;
    } | null;
  };
  user_profile?: {
    id: string;
    full_name: string;
  };
}

export interface CreateReservationData {
  equipment_id: string;
  start_time: string;
  end_time?: string | null;
  notes?: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'reservation_conflict' | 'maintenance' | 'inactive' | 'open_fault';
  message?: string;
  conflictingReservation?: Reservation;
}

/**
 * Check if equipment is available for a time period
 */
export async function checkAvailability(
  equipmentId: string,
  startTime: Date,
  endTime?: Date | null
): Promise<AvailabilityResult> {
  const supabase = createClient();

  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('status')
    .eq('id', equipmentId)
    .single();

  if (equipmentError) {
    console.error('Error checking equipment status:', equipmentError);
    throw equipmentError;
  }

  if (equipment?.status === 'maintenance') {
    return {
      available: false,
      reason: 'maintenance',
      message: 'Utstyret er under vedlikehold og kan ikke reserveres.',
    };
  }

  if (equipment?.status === 'inactive') {
    return {
      available: false,
      reason: 'inactive',
      message: 'Utstyret er inaktivt og kan ikke reserveres.',
    };
  }

  // Block reservation when there is an open corrective work order (a reported
  // fault). Broken equipment should not be bookable until the fault is handled.
  // Faults with priority 'low' (cosmetic, e.g. a cracked glass on a light) do
  // NOT block booking — the equipment is still usable.
  const { data: openFaults, error: faultError } = await supabase
    .from('work_orders')
    .select('id, title')
    .eq('equipment_id', equipmentId)
    .eq('type', 'corrective')
    .neq('priority', 'low')
    .in('status', ['open', 'in_progress', 'waiting_parts'])
    .limit(1);

  if (faultError) {
    console.error('Error checking open faults:', faultError);
  } else if (openFaults && openFaults.length > 0) {
    return {
      available: false,
      reason: 'open_fault',
      message: 'Utstyret har en åpen feilmelding og bør utbedres før det reserveres.',
    };
  }

  let query = supabase
    .from('equipment_reservations')
    .select('*, equipment:equipment_id(id, name), user_profile:user_id(id, full_name)')
    .eq('equipment_id', equipmentId)
    .eq('status', 'active');

  // Check for overlapping reservations
  if (endTime) {
    // Has end time: Check if there's overlap with [startTime, endTime]
    query = query.or(
      `and(start_time.lte.${endTime.toISOString()},or(end_time.is.null,end_time.gte.${startTime.toISOString()}))`
    );
  } else {
    // No end time means the new reservation is open-ended, so it overlaps any
    // active reservation that has not ended before our start time, including
    // future reservations.
    query = query.or(`end_time.is.null,end_time.gte.${startTime.toISOString()}`);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error checking availability:', error);
    throw error;
  }

  if (data && data.length > 0) {
    return {
      available: false,
      reason: 'reservation_conflict',
      message: 'Utstyret er ikke tilgjengelig i denne perioden.',
      conflictingReservation: data[0],
    };
  }

  return { available: true };
}

/**
 * Create a new reservation
 */
export async function createReservation(data: CreateReservationData): Promise<Reservation> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to create reservation');

  // Check availability first
  const startTime = new Date(data.start_time);
  const endTime = data.end_time ? new Date(data.end_time) : null;

  const availability = await checkAvailability(data.equipment_id, startTime, endTime);
  if (!availability.available) {
    throw new Error(availability.message || 'Utstyret er ikke tilgjengelig i denne perioden');
  }

  // Create reservation
  const reservationData = {
    equipment_id: data.equipment_id,
    user_id: user.id,
    start_time: data.start_time,
    end_time: data.end_time || null,
    notes: data.notes || null,
    status: 'active' as ReservationStatus,
  };

  const { data: reservation, error } = await supabase
    .from('equipment_reservations')
    .insert(reservationData)
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .single();

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }

  await refreshEquipmentStatus(data.equipment_id);

  return reservation;
}

/**
 * End/complete a reservation
 */
export async function completeReservation(reservationId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in');

  const { data: updatedReservation, error } = await supabase
    .from('equipment_reservations')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .select('equipment_id')
    .single();

  if (error) {
    console.error('Error completing reservation:', error);
    throw error;
  }

  if (updatedReservation?.equipment_id) {
    await refreshEquipmentStatus(updatedReservation.equipment_id);
  }
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in');

  const { data: updatedReservation, error } = await supabase
    .from('equipment_reservations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .select('equipment_id')
    .single();

  if (error) {
    console.error('Error cancelling reservation:', error);
    throw error;
  }

  if (updatedReservation?.equipment_id) {
    await refreshEquipmentStatus(updatedReservation.equipment_id);
  }
}

/**
 * Get all reservations for current user
 */
export async function getMyReservations(): Promise<Reservation[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('equipment_reservations')
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .eq('user_id', user.id)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching my reservations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all active reservations (equipment in use)
 */
export async function getAllActiveReservations(): Promise<Reservation[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('equipment_reservations')
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .eq('status', 'active')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching active reservations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active reservation for specific equipment
 */
export async function getActiveReservationForEquipment(equipmentId: string): Promise<Reservation | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('equipment_reservations')
    .select(`
      *,
      equipment:equipment_id(id, name, model, image_url, category:category_id(name, icon, color)),
      user_profile:user_id(id, full_name)
    `)
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .or(`end_time.is.null,end_time.gt.${new Date().toISOString()}`)
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Error fetching reservation:', error);
    throw error;
  }

  return data || null;
}

/**
 * Auto-complete reservations that have passed their end time
 * Should be called periodically or on page load
 */
export async function autoCompleteExpiredReservations(): Promise<number> {
  const supabase = createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('equipment_reservations')
    .update({
      status: 'completed',
      updated_at: now,
    })
    .eq('status', 'active')
    .not('end_time', 'is', null)
    .lte('end_time', now)
    .select('id, equipment_id');

  if (error) {
    console.error('Error auto-completing reservations:', error);
    return 0;
  }

  const equipmentIds = Array.from(new Set((data || []).map((reservation) => reservation.equipment_id)));
  await Promise.all(equipmentIds.map((equipmentId) => refreshEquipmentStatus(equipmentId)));

  return data?.length || 0;
}
