'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaSearch, FaPlus, FaFileInvoiceDollar, FaExclamationTriangle, FaChevronRight } from 'react-icons/fa';
import { Part, UNIT_LABELS, isLowStock } from '@/lib/parts';
import PartModal from './PartModal';
import PurchaseModal from './PurchaseModal';

interface Props {
  initialParts: Part[];
  equipment: { id: string; name: string }[];
}

export default function PartsClient({ initialParts, equipment }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [showSold, setShowSold] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    initialParts.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [initialParts]);

  const lowCount = initialParts.filter(isLowStock).length;
  const inStockCount = initialParts.filter((p) => p.current_stock > 0).length;
  const soldCount = initialParts.length - inStockCount;

  const filtered = initialParts.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.part_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.ean?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    if (!matchSearch || !matchCat) return false;
    if (lowOnly) return isLowStock(p);
    // «Utsolgt»-visning viser bare varer med tom saldo. Søk finner alt.
    if (showSold) return p.current_stock <= 0;
    if (search) return true;
    // Standard: skjul saldo 0 — varen blir liggende i basen for gjenbruk.
    return p.current_stock > 0;
  });

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[28px] font-medium text-ink tracking-tight2 m-0 leading-tight">
            Varelager
          </h1>
          <p className="text-[14px] text-ink2 m-0 mt-0.5">
            {inStockCount} på lager{lowCount > 0 ? ` · ${lowCount} lavt lager` : ''}
            {soldCount > 0 ? ` · ${soldCount} utsolgt` : ''}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setShowPurchase(true)}
            className="flex items-center gap-2 bg-paper text-ink border border-line px-3 py-2 rounded-[12px] text-sm font-medium"
          >
            <FaFileInvoiceDollar className="text-[13px]" /> Innkjøp
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-ink text-paper px-3 py-2 rounded-[12px] text-sm font-medium"
          >
            <FaPlus className="text-[12px]" /> Ny del
          </button>
        </div>
      </div>

      {/* Søk */}
      <div className="flex items-center gap-2.5 bg-paper border border-line rounded-[14px] px-3.5 py-3 text-ink3">
        <FaSearch className="text-[15px] flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søk navn, delenummer, EAN…"
          className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink3 outline-none"
        />
      </div>

      {/* Filtre */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-0.5">
        <FilterChip active={category === 'all' && !lowOnly && !showSold} onClick={() => { setCategory('all'); setLowOnly(false); setShowSold(false); }} label={`På lager · ${inStockCount}`} />
        {lowCount > 0 && (
          <FilterChip active={lowOnly} onClick={() => { setLowOnly(true); setShowSold(false); setCategory('all'); }} label={`Lavt lager · ${lowCount}`} tone="rust" />
        )}
        {soldCount > 0 && (
          <FilterChip active={showSold} onClick={() => { setShowSold(true); setLowOnly(false); setCategory('all'); }} label={`Utsolgt · ${soldCount}`} />
        )}
        {categories.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => { setCategory(c); setLowOnly(false); setShowSold(false); }} label={c} />
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-paper border border-line rounded-[18px] p-8 text-center">
          <p className="text-ink2 text-sm">Ingen deler funnet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((p) => {
            const low = isLowStock(p);
            return (
              <Link
                key={p.id}
                href={`/parts/${p.id}`}
                className={`flex items-center gap-3.5 bg-paper border rounded-[16px] px-4 py-3.5 ${
                  low ? 'border-l-[3px] border-l-rust border-line' : 'border-line'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-ink tracking-tightish truncate">{p.name}</div>
                  <div className="text-[12.5px] text-ink3 mt-0.5 truncate">
                    {[p.part_number, p.category, p.location].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      p.part_type === 'consumable' ? 'bg-skyBg text-sky' : 'bg-mossBg text-moss'
                    }`}>
                      {p.part_type === 'consumable' ? 'Forbruk' : 'Utstyrsspesifikk'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-[16px] font-semibold ${low ? 'text-rust' : 'text-ink'}`}>
                    {p.current_stock} <span className="text-[12px] font-normal text-ink3">{UNIT_LABELS[p.unit]}</span>
                  </div>
                  {low && (
                    <div className="text-[11px] text-rust inline-flex items-center gap-1 mt-0.5">
                      <FaExclamationTriangle className="text-[9px]" /> under min. {p.min_stock}
                    </div>
                  )}
                </div>
                <FaChevronRight className="text-ink3 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="h-6" />

      {showAdd && (
        <PartModal
          equipment={equipment}
          existingCategories={categories}
          existingParts={initialParts}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refresh(); }}
        />
      )}
      {showPurchase && (
        <PurchaseModal
          parts={initialParts}
          equipment={equipment}
          onClose={() => setShowPurchase(false)}
          onSuccess={() => { setShowPurchase(false); refresh(); }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: 'rust' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium ${
        active
          ? tone === 'rust' ? 'bg-rust text-white' : 'bg-ink text-paper'
          : 'bg-paper text-ink border border-line'
      }`}
    >
      {label}
    </button>
  );
}
