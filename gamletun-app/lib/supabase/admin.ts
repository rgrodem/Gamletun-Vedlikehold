// Supabase-klient med service-rolle. KUN for server-side bruk (API-ruter
// og cron) — denne nøkkelen omgår RLS og må aldri nå klienten.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (og NEXT_PUBLIC_SUPABASE_URL) må være satt');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
