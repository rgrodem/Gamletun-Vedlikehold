'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Landingsside for inviterte brukere: auth-callbacken har gitt en sesjon, og her
// setter brukeren sitt eget passord før de slipper inn i appen.
export default function SettPassordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?error=expired');
        return;
      }
      setReady(true);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn.');
      return;
    }
    if (password !== confirm) {
      setError('Passordene er ikke like.');
      return;
    }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setSaving(false);
      setError('Kunne ikke sette passord. Prøv igjen.');
      return;
    }
    router.replace('/');
    router.refresh();
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex flex-col px-7 pt-10 pb-5 max-w-md w-full mx-auto">
        <h1 className="font-serif text-[28px] font-medium text-ink mb-2 tracking-tight2 leading-tight">
          Velg et passord
        </h1>
        <p className="text-ink2 text-[15px] leading-[1.5] m-0">
          Sett et passord for kontoen din, så er du klar til å logge inn.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2.5">
          {error && (
            <div className="bg-rustBg border border-rust/30 text-rust px-4 py-3 rounded-[14px] text-sm">
              {error}
            </div>
          )}
          <input
            type="password"
            autoComplete="new-password"
            required
            placeholder="Nytt passord (minst 8 tegn)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={saving}
            className="w-full bg-white text-ink border border-line rounded-[14px] px-4 py-4 text-base outline-none focus:border-ink2 disabled:opacity-50"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          />
          <input
            type="password"
            autoComplete="new-password"
            required
            placeholder="Gjenta passord"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={saving}
            className="w-full bg-white text-ink border border-line rounded-[14px] px-4 py-4 text-base outline-none focus:border-ink2 disabled:opacity-50"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-3 bg-ink text-bg rounded-[14px] px-4 py-4 text-base font-semibold tracking-tightish cursor-pointer disabled:opacity-50"
          >
            {saving && (
              <span className="w-5 h-5 border-2 border-bg/40 border-t-bg rounded-full animate-spin motion-reduce:animate-none" />
            )}
            {saving ? 'Lagrer…' : 'Lagre og fortsett'}
          </button>
        </form>
      </div>
    </div>
  );
}
