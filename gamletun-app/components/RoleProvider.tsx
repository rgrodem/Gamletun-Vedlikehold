'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Role = 'admin' | 'user';

interface RoleContextValue {
  role: Role | null; // null mens den lastes
  isAdmin: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextValue>({ role: null, isAdmin: false, loading: true });

/**
 * Henter innlogget brukers rolle én gang og deler den med hele appen.
 * Brukes til å SKJULE admin-knapper for medlemmer — den harde håndhevingen
 * ligger i databasen (RLS, migration 020), så UI-et er bare for opplevelsen.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setRole(null); setLoading(false); }
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!cancelled) {
        setRole((data?.role as Role) ?? 'user');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'admin', loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
