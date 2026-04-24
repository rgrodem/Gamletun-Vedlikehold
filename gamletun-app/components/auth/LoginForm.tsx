'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LoginFormProps {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Denne Google-kontoen har ikke tilgang. Kontakt administrator.',
  auth_error: 'Pålogging feilet. Prøv igjen.',
  oauth_cancelled: 'Pålogging ble avbrutt.',
};

export default function LoginForm({ error }: LoginFormProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="mt-auto flex flex-col gap-2.5 pb-4">
      {error && ERROR_MESSAGES[error] && (
        <div className="bg-rustBg border border-rust/30 text-rust px-4 py-3 rounded-[14px] text-sm">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      {/* Google — primary */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex items-center justify-center gap-3 bg-white text-[#1f1f1f] border border-line rounded-[14px] px-4 py-4 text-base font-semibold tracking-tightish cursor-pointer disabled:opacity-50"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-11.3 7.2-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.1-5.1C33.9 5.5 29.2 3.6 24 3.6 12.7 3.6 3.6 12.7 3.6 24S12.7 44.4 24 44.4c11.5 0 20.1-8.3 20.1-20.4 0-1.2-.1-2.3-.5-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M5.7 13.3l5.9 4.3C13.2 13.9 18.2 11 24 11c3 0 5.7 1.1 7.8 3l5.1-5.1C33.9 5.5 29.2 3.6 24 3.6 16.4 3.6 9.8 7.6 5.7 13.3z"
            />
            <path
              fill="#4CAF50"
              d="M24 44.4c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.4-4.5 2.3-7.1 2.3-5.7 0-10.6-3.8-11.3-8.9l-5.9 4.6C9.7 40.3 16.2 44.4 24 44.4z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 2-2.1 3.8-3.9 5l6.1 5c-.4.4 6.6-4.8 6.6-13.1 0-1.2-.1-2.3-.5-3.5z"
            />
          </svg>
        )}
        {loading ? 'Omdirigerer…' : 'Fortsett med Google'}
      </button>

      <p className="text-[12px] text-ink3 text-center m-0 mt-2 leading-[1.5]">
        Ved å fortsette godtar du{' '}
        <span className="text-ink2 underline">vilkårene</span>
        <br />
        Gamletun Vedlikehold · v2.0
      </p>
    </div>
  );
}
