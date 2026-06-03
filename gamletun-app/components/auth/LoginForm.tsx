'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LoginFormProps {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Denne kontoen har ikke tilgang. Kontakt administrator.',
  auth_error: 'Innlogging feilet. Prøv igjen.',
  expired: 'Økten utløp. Logg inn på nytt.',
};

export default function LoginForm({ error }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Hold innlogget bruker innlogget: sjekk eksisterende sesjon ved oppstart og
  // lytt på auth-endringer (viktig for mobil-PWA der appen gjenåpnes).
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) {
        router.replace('/');
      } else if (active) {
        setCheckingSession(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setFormError('Fyll inn både e-post og passord.');
      return;
    }

    setLoading(true);
    setFormError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (signInError) {
      setLoading(false);
      setFormError('Feil e-post eller passord. Prøv igjen.');
      return;
    }

    // Sørg for at brukeren har en profil (tidligere opprettet i auth-callback,
    // som ikke lenger brukes ved passord-innlogging).
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from('profiles').insert({
            id: user.id,
            full_name:
              user.user_metadata?.full_name ?? user.user_metadata?.name ?? trimmed,
            role: 'user',
          });
        }
      }
    } catch {
      // Profilsjekk er ikke kritisk for innlogging — fortsett uansett.
    }

    router.replace('/');
    router.refresh();
  };

  // Unngå å vise skjemaet et kort øyeblikk hvis brukeren allerede er innlogget.
  if (checkingSession) {
    return (
      <div className="mt-auto flex items-center justify-center pb-8">
        <span className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  const showServerError = error && ERROR_MESSAGES[error] && !formError;

  return (
    <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-2.5 pb-4">
      {showServerError && (
        <div className="bg-rustBg border border-rust/30 text-rust px-4 py-3 rounded-[14px] text-sm">
          {ERROR_MESSAGES[error]}
        </div>
      )}
      {formError && (
        <div className="bg-rustBg border border-rust/30 text-rust px-4 py-3 rounded-[14px] text-sm">
          {formError}
        </div>
      )}

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="din@gamletun.no"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="w-full bg-white text-ink border border-line rounded-[14px] px-4 py-4 text-base outline-none focus:border-ink2 disabled:opacity-50"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      />

      <input
        type="password"
        autoComplete="current-password"
        required
        placeholder="Passord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        className="w-full bg-white text-ink border border-line rounded-[14px] px-4 py-4 text-base outline-none focus:border-ink2 disabled:opacity-50"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      />

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-3 bg-ink text-bg rounded-[14px] px-4 py-4 text-base font-semibold tracking-tightish cursor-pointer disabled:opacity-50"
      >
        {loading && (
          <span className="w-5 h-5 border-2 border-bg/40 border-t-bg rounded-full animate-spin motion-reduce:animate-none" />
        )}
        {loading ? 'Logger inn…' : 'Logg inn'}
      </button>

      <p className="text-[12px] text-ink3 text-center m-0 mt-2 leading-[1.5]">
        Logg inn med e-post og passord.
        <br />
        Gamletun Vedlikehold · v2.0
      </p>
    </form>
  );
}
