// Hjelpere for å varsle alle administratorer. KUN server-side — bruker
// service-rollen (omgår RLS) for å lese profiles og slå opp e-post i auth.
import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/** ID-ene til alle brukere med rollen 'admin'. */
export async function getAdminUserIds(admin: AdminClient): Promise<string[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin');
  if (error || !data?.length) return [];
  return data.map((p) => p.id as string);
}

/**
 * E-postadressene til alle admin-brukere. Lite team, så vi slår opp én og én.
 * Hopper over brukere uten e-post.
 */
export async function getAdminEmails(admin: AdminClient): Promise<string[]> {
  const ids = await getAdminUserIds(admin);
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}
