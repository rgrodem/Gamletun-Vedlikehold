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
 * Henter innlogget brukers rolle og deler den med hele appen. Rollen hentes på
 * nytt når appen kommer i forgrunnen igjen og når innloggingstilstanden endrer
 * seg, slik at en nylig endret rolle slår igjennom uten full omstart.
 * Brukes til å SKJULE admin-knapper for medlemmer — den harde håndhevingen
 * ligger i databasen (RLS, migration 020), så UI-et er bare for opplevelsen.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      setRole((data?.role as Role) ?? 'user');
      setLoading(false);
    };

    fetchRole();

    // En PWA blir ofte liggende åpen, så rollen ville ellers fryse på verdien
    // den hadde ved første lasting. Hent på nytt når appen blir synlig igjen og
    // ved endring i innloggingstilstand.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRole();
    };
    document.addEventListener('visibilitychange', onVisible);
    // VIKTIG: ikke kall Supabase-funksjoner synkront inne i denne callbacken —
    // det kan gi en deadlock i auth-klienten. Defer med setTimeout(0) så den
    // kjører utenfor callbackens lås.
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => { void fetchRole(); }, 0);
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      authSub.subscription.unsubscribe();
    };
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
