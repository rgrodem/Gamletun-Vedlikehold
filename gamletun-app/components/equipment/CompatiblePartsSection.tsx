'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBoxes, FaExclamationTriangle } from 'react-icons/fa';
import { Part, UNIT_LABELS, getPartsForEquipment, isLowStock } from '@/lib/parts';

/**
 * Viser deler på lager som passer dette utstyret — så man ser om man allerede
 * har f.eks. riktig oljefilter før man bestiller nytt.
 */
export default function CompatiblePartsSection({ equipmentId }: { equipmentId: string }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPartsForEquipment(equipmentId)
      .then((p) => { if (!cancelled) setParts(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [equipmentId]);

  // Skjul seksjonen helt hvis ingen deler er knyttet (unngår støy på utstyr uten deler).
  if (!loading && parts.length === 0) return null;

  return (
    <div>
      <h3 className="font-serif text-[18px] font-medium text-ink tracking-tightish mb-2.5 flex items-center gap-2">
        <FaBoxes className="text-ink3 text-[15px]" /> Deler på lager
      </h3>
      {loading ? (
        <div className="h-16 bg-line/50 rounded-[16px] animate-pulse" />
      ) : (
        <div className="bg-paper border border-line rounded-[16px] overflow-hidden">
          {parts.map((p, i) => {
            const low = isLowStock(p);
            return (
              <Link
                key={p.id}
                href={`/parts/${p.id}`}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 active:bg-line2 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className="min-w-0">
                  <div className="text-[14px] text-ink font-medium truncate">{p.name}</div>
                  <div className="text-[12px] text-ink3 truncate">
                    {[p.part_number, p.location && `Hylle ${p.location}`].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div className={`text-[14px] font-semibold flex-shrink-0 ${low ? 'text-rust' : 'text-ink'}`}>
                  {low && <FaExclamationTriangle className="inline text-[10px] mr-1" />}
                  {p.current_stock} {UNIT_LABELS[p.unit]}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
