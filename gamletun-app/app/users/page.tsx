import { createClient } from '@/lib/supabase/server';
import AppLayout from '@/components/layout/AppLayout';
import UsersClient from '@/components/users/UsersClient';
import { getWorkOrdersDashboard } from '@/lib/work-orders';

export const dynamic = 'force-dynamic';

export interface ProfileRow {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user';
  created_at: string | null;
}

export default async function UsersPage() {
  const supabase = await createClient();

  const [userResult, profilesResult, workOrderStats] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('id, full_name, role, created_at').order('full_name'),
    getWorkOrdersDashboard(supabase),
  ]);

  const user = userResult.data.user;

  // Server-side rolle-sjekk: bare admin ser brukeradministrasjonen.
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .maybeSingle();
  const isAdmin = me?.role === 'admin';

  return (
    <AppLayout email={user?.email} workOrderStats={workOrderStats}>
      {isAdmin ? (
        <UsersClient
          profiles={(profilesResult.data as ProfileRow[]) || []}
          currentUserId={user?.id ?? ''}
        />
      ) : (
        <div className="bg-paper border border-line rounded-[18px] p-8 text-center">
          <h1 className="font-serif text-[22px] font-medium text-ink mb-2">Ingen tilgang</h1>
          <p className="text-ink2 text-sm">Bare administratorer kan se brukeradministrasjon.</p>
        </div>
      )}
    </AppLayout>
  );
}
