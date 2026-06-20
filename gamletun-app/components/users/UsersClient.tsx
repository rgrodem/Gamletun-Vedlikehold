'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserShield, FaUser, FaInfoCircle, FaUserPlus } from 'react-icons/fa';
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

  // Invitasjon av ny bruker
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteMsg({ kind: 'err', text: 'Skriv inn en gyldig e-postadresse.' });
      return;
    }
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName: inviteName.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Kunne ikke invitere');
      setInviteMsg({
        kind: 'ok',
        text: data.emailed
          ? `Invitasjon sendt til ${email}.`
          : 'Bruker opprettet, men e-posten kunne ikke sendes. Sjekk e-postoppsettet.',
      });
      setInviteEmail('');
      setInviteName('');
      setInviteRole('user');
      router.refresh();
    } catch (err) {
      setInviteMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Kunne ikke invitere' });
    } finally {
      setInviting(false);
    }
  };

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

      {/* Inviter ny bruker */}
      <form onSubmit={handleInvite} className="bg-paper border border-line rounded-[16px] p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-ink">
          <FaUserPlus className="text-ink2" />
          <span className="text-[15px] font-semibold">Inviter ny bruker</span>
        </div>
        <p className="text-[12.5px] text-ink3 m-0">
          Brukeren får en e-post med lenke for å sette passord og logge inn.
        </p>
        {inviteMsg && (
          <div
            className={`rounded-[12px] px-3 py-2 text-[13px] border ${
              inviteMsg.kind === 'ok'
                ? 'bg-mossBg border-moss/30 text-moss'
                : 'bg-rustBg border-rust/30 text-rust'
            }`}
          >
            {inviteMsg.text}
          </div>
        )}
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="E-postadresse"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          disabled={inviting}
          className="w-full bg-white text-ink border border-line rounded-[12px] px-3.5 py-3 text-[15px] outline-none focus:border-ink2 disabled:opacity-50"
        />
        <input
          type="text"
          placeholder="Navn (valgfritt)"
          value={inviteName}
          onChange={(e) => setInviteName(e.target.value)}
          disabled={inviting}
          className="w-full bg-white text-ink border border-line rounded-[12px] px-3.5 py-3 text-[15px] outline-none focus:border-ink2 disabled:opacity-50"
        />
        <div className="flex gap-2">
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
            disabled={inviting}
            className="flex-1 bg-white text-ink border border-line rounded-[12px] px-3.5 py-3 text-[15px] outline-none focus:border-ink2 disabled:opacity-50"
          >
            <option value="user">Medlem</option>
            <option value="admin">Administrator</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center justify-center gap-2 bg-ink text-paper rounded-[12px] px-4 py-3 text-[14px] font-semibold disabled:opacity-60"
          >
            {inviting && (
              <span className="w-4 h-4 border-2 border-paper/40 border-t-paper rounded-full animate-spin motion-reduce:animate-none" />
            )}
            {inviting ? 'Sender…' : 'Send invitasjon'}
          </button>
        </div>
      </form>

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
