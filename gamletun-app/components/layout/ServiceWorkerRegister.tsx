'use client';

import { useEffect } from 'react';

/**
 * Registers the public/sw.js service worker after the page has loaded.
 *
 * Kept as a tiny client component so the rest of the layout can stay on the
 * server. We only register in production — during `next dev` Next.js hot-reload
 * fights with the service worker cache and that confuses more than it helps.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Swallow — a failed registration shouldn't break the app.
          console.warn('Service worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
