// Equipment Reservations API functions
import { createClient } from '@/lib/supabase/client';

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

/**
 * Check if equipment is available for a time period
 */
export async function checkAvailability(
  equipmentId: string,
  startTime: Date,
  endTime?: Date | null
): Promise<{ available: boolean; conflictingReservation?: Reservation }> {
  const supabase = createClient();

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
    // No end time: Check if there's any active reservation starting before our start time
    // that either has no end time or ends after our start time
    query = query
      .lte('start_time', startTime.toISOString())
      .or(`end_time.is.null,end_time.gte.${startTime.toISOString()}`);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error checking availability:', error);
    throw error;
  }

  if (data && data.length > 0) {
    return {
      available: false,
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
    throw new Error('Equipment is not available for this time period');
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

  return reservation;
}

/**
 * End/complete a reservation
 */
export async function completeReservation(reservationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('equipment_reservations')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);

  if (error) {
    console.error('Error completing reservation:', error);
    throw error;
  }
}

/**
 * Cancel a reservation
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('equipment_reservations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);

  if (error) {
    console.error('Error cancelling reservation:', error);
    throw error;
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
    .select('id');

  if (error) {
    console.error('Error auto-completing reservations:', error);
    return 0;
  }

  return data?.length || 0;
}
