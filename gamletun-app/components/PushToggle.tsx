'use client';

import { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';

// VAPID public key (base64url) → Uint8Array for PushManager.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State = 'unsupported' | 'idle' | 'subscribed' | 'working' | 'denied' | 'error';

/**
 * Lar brukeren slå på push-varsler. Skjuler seg selv hvis nettleseren ikke
 * støtter push, eller hvis allerede påslått. Krever registrert service worker
 * (kun i produksjon).
 */
export default function PushToggle() {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        if (!cancelled) setState('unsupported');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = await reg?.pushManager.getSubscription();
        if (!cancelled && existing) setState('subscribed');
      } catch {
        /* la stå som idle */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setState('working');
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch('/api/push/public-key');
      if (!res.ok) {
        setState('error');
        setMessage('Push er ikke konfigurert på serveren ennå.');
        return;
      }
      const { key } = await res.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
      const save = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!save.ok) {
        setState('error');
        setMessage('Kunne ikke lagre abonnementet.');
        return;
      }
      setState('subscribed');
    } catch (err) {
      console.error('Kunne ikke slå på push:', err);
      setState('error');
      setMessage('Kunne ikke slå på varsler. På iPhone må appen være lagt til på Hjem-skjerm.');
    }
  };

  if (state === 'unsupported' || state === 'subscribed') return null;

  return (
    <div className="bg-paper border border-line rounded-[14px] px-3.5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <FaBell className="text-ink3 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[14px] text-ink font-medium m-0">Push-varsler</p>
          <p className="text-[12px] text-ink3 m-0">
            {state === 'denied'
              ? 'Varsler er blokkert i nettleseren — skru på i innstillinger.'
              : message || 'Få varsel på mobilen når feil meldes.'}
          </p>
        </div>
      </div>
      {state !== 'denied' && (
        <button
          type="button"
          onClick={enable}
          disabled={state === 'working'}
          className="flex-shrink-0 text-[13px] font-semibold text-paper bg-ink rounded-full px-3.5 py-2 disabled:opacity-50"
        >
          {state === 'working' ? 'Slår på…' : 'Slå på'}
        </button>
      )}
    </div>
  );
}
