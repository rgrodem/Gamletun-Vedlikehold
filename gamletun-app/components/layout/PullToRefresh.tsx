'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSyncAlt } from 'react-icons/fa';

// Dra-ned-for-å-oppdatere for mobil/PWA. Lytter på touch øverst på siden og
// kaller router.refresh() når man drar forbi terskelen — en pålitelig måte å
// hente friske data på uavhengig av automatisk oppdatering.
const THRESHOLD = 70; // px man må dra for å utløse
const MAX_PULL = 110; // maks visuell dra-lengde

export default function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs så touch-lytterne kan bindes én gang og lese ferske verdier.
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  const setPullBoth = (v: number) => {
    pullRef.current = v;
    setPull(v);
  };

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      // Avbryt hvis man har scrollet ned eller drar oppover.
      if (dy <= 0 || window.scrollY > 0) {
        setPullBoth(0);
        return;
      }
      // Demp dragingen så den føles elastisk.
      setPullBoth(Math.min(MAX_PULL, dy * 0.5));
      e.preventDefault();
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullBoth(THRESHOLD);
        router.refresh();
        // router.refresh() gir ikke et løfte — vis spinneren kort, så lukk.
        window.setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullBoth(0);
        }, 900);
      } else {
        setPullBoth(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [router]);

  const visible = pull > 4 || refreshing;
  const ready = pull >= THRESHOLD;

  return (
    <div
      aria-hidden
      className="fixed left-1/2 z-[55] pointer-events-none lg:hidden"
      style={{
        top: 'env(safe-area-inset-top)',
        transform: `translateX(-50%) translateY(${pull}px)`,
        opacity: visible ? 1 : 0,
        transition: startY.current === null ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
      }}
    >
      <div className="mt-1 bg-paper border border-line rounded-full shadow-md p-2.5">
        <FaSyncAlt
          className={`text-sm ${ready || refreshing ? 'text-moss' : 'text-ink3'} ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
        />
      </div>
    </div>
  );
}
