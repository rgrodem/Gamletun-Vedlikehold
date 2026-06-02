'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LoginFormProps {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Denne e-posten har ikke tilgang. Bruk din @gamletun.no-adresse.',
  auth_error: 'Innlogging feilet. Be om en ny lenke og prøv igjen.',
  expired: 'Lenken var utløpt eller allerede brukt. Be om en ny.',
};

export default function LoginForm({ error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setFormError('Skriv inn en gyldig e-postadresse.');
      return;
    }

    setLoading(true);
    setFormError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (otpError) {
      setFormError('Kunne ikke sende lenke akkurat nå. Prøv igjen om litt.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mt-auto flex flex-col gap-2.5 pb-4">
        <div className="bg-white border border-line rounded-[14px] px-5 py-6 text-center">
          <div className="font-serif text-[22px] text-ink mb-2 tracking-tight2">Sjekk e-posten din</div>
          <p className="text-ink2 text-[15px] leading-[1.5] m-0">
            Vi sendte en innloggingslenke til<br />
            <span className="text-ink font-medium">{email.trim().toLowerCase()}</span>
          </p>
          <p className="text-ink3 text-[13px] leading-[1.5] mt-3 mb-0">
            Åpne lenken på denne enheten for å logge inn. Husk å sjekke søppelpost.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setFormError(null);
          }}
          className="text-ink2 text-sm underline cursor-pointer bg-transparent border-0 py-2"
        >
          Bruk en annen e-post
        </button>
        <p className="text-[12px] text-ink3 text-center m-0 mt-1 leading-[1.5]">
          Gamletun Vedlikehold · v2.0
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="mt-auto flex flex-col gap-2.5 pb-4">
      {error && ERROR_MESSAGES[error] && (
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
        placeholder="din@gamletun.no"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="w-full bg-white text-ink border border-line rounded-[14px] px-4 py-4 text-base outline-none focus:border-ink2 disabled:opacity-50"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      />

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-3 bg-ink text-bg rounded-[14px] px-4 py-4 text-base font-semibold tracking-tightish cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
        ) : null}
        {loading ? 'Sender lenke…' : 'Send innloggingslenke'}
      </button>

      <p className="text-[12px] text-ink3 text-center m-0 mt-2 leading-[1.5]">
        Du får en lenke på e-post — ingen passord.
        <br />
        Gamletun Vedlikehold · v2.0
      </p>
    </form>
  );
}
