'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserShield, FaUser, FaInfoCircle } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/app/users/page';

interface Props {
  profiles: ProfileRow[];
  currentUserId: string;
}

const ROLE_LABEL: Record<'admin' | 'user', string> = {
  admin: 'Administrator',
  user: 'Medlem',
};

/**
 * Brukeradministrasjon (kun admin). Skru admin/medlem av og på.
 * Medlem = kan lese alt, melde feil og reservere — ikke endre/slette noe annet.
 * Den harde håndhevingen ligger i databasen (RLS, migration 020).
 */
export default function UsersClient({ profiles, currentUserId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const setRole = async (id: string, role: 'admin' | 'user') => {
    setSaving(id);
    setError('');
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (updErr) throw updErr;
      router.refresh();
    } catch (err) {
      console.error('Kunne ikke endre rolle:', err);
      setError('Kunne ikke endre rolle. Prøv igjen.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-[28px] font-medium text-ink tracking-tight2 m-0 leading-tight">Brukere</h1>
        <p className="text-[14px] text-ink2 m-0 mt-0.5">{profiles.length} brukere</p>
      </div>

      <div className="bg-skyBg border border-sky/30 rounded-[14px] p-3.5 flex gap-2.5 text-[13px] text-ink2">
        <FaInfoCircle className="text-sky flex-shrink-0 mt-0.5" />
        <p className="m-0">
          <span className="font-semibold text-ink">Medlem</span> kan lese alt, melde feil og reservere utstyr —
          men ikke opprette, endre eller slette noe annet. <span className="font-semibold text-ink">Administrator</span> har full tilgang.
          Nye brukere blir medlem ved første innlogging.
        </p>
      </div>

      {error && (
        <div className="bg-rustBg border border-rust/30 rounded-[14px] p-3 text-rust text-sm">{error}</div>
      )}

      <div className="flex flex-col gap-2.5">
        {profiles.map((p) => {
          const isMe = p.id === currentUserId;
          const admin = p.role === 'admin';
          return (
            <div key={p.id} className="flex items-center gap-3.5 bg-paper border border-line rounded-[16px] px-4 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${admin ? 'bg-mossBg text-moss' : 'bg-line2 text-ink3'}`}>
                {admin ? <FaUserShield /> : <FaUser />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-ink truncate">
                  {p.full_name || 'Uten navn'}{isMe ? ' (deg)' : ''}
                </div>
                <div className="text-[12.5px] text-ink3">{ROLE_LABEL[p.role]}</div>
              </div>
              {isMe ? (
                <span className="text-[12px] text-ink3">Kan ikke endre egen rolle</span>
              ) : (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setRole(p.id, 'user')}
                    disabled={saving === p.id || !admin}
                    className={`px-3 py-2 rounded-[10px] text-[13px] font-medium border ${!admin ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-line'} disabled:opacity-60`}
                  >
                    Medlem
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(p.id, 'admin')}
                    disabled={saving === p.id || admin}
                    className={`px-3 py-2 rounded-[10px] text-[13px] font-medium border ${admin ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-line'} disabled:opacity-60`}
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
