'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaEdit, FaQrcode, FaPlus, FaMinus, FaBalanceScale, FaTrash } from 'react-icons/fa';
import {
  Part,
  StockMovement,
  UNIT_LABELS,
  MOVEMENT_LABELS,
  MovementType,
  getPartMovements,
  getPartCompatibility,
  addMovement,
  deletePart,
  isLowStock,
} from '@/lib/parts';
import PartModal from './PartModal';
import PartLabelModal from './PartLabelModal';
import { useRole } from '@/components/RoleProvider';

interface Props {
  part: Part;
  equipment: { id: string; name: string }[];
}

export default function PartDetailClient({ part, equipment }: Props) {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [compat, setCompat] = useState<{ equipment_id: string; name: string }[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [action, setAction] = useState<MovementType | null>(null);

  const load = useCallback(() => {
    getPartMovements(part.id).then(setMovements).catch(() => {});
    getPartCompatibility(part.id).then(setCompat).catch(() => {});
  }, [part.id]);

  useEffect(() => { load(); }, [load]);

  const low = isLowStock(part);

  return (
    <div className="space-y-4">
      <Link href="/parts" className="inline-flex items-center gap-2 text-ink2 text-sm">
        <FaArrowLeft className="text-xs" /> Varelager
      </Link>

      {/* Header */}
      <div className="bg-paper border border-line rounded-[18px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[24px] font-medium text-ink tracking-tight2 leading-tight break-words">{part.name}</h1>
            <p className="text-[13px] text-ink3 mt-1">
              {[part.part_number, part.category, part.location && `Hylle ${part.location}`].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => setShowLabel(true)} className="p-2.5 border border-line rounded-[12px] text-ink" aria-label="QR-etikett"><FaQrcode /></button>
            {isAdmin && <button onClick={() => setShowEdit(true)} className="p-2.5 border border-line rounded-[12px] text-ink" aria-label="Rediger"><FaEdit /></button>}
          </div>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink3 font-semibold">På lager</div>
            <div className={`font-serif text-[34px] font-medium leading-none mt-1 ${low ? 'text-rust' : 'text-ink'}`}>
              {part.current_stock} <span className="text-[16px] text-ink3 font-normal">{UNIT_LABELS[part.unit]}</span>
            </div>
            {part.min_stock > 0 && (
              <div className={`text-[12px] mt-1 ${low ? 'text-rust' : 'text-ink3'}`}>
                Min. {part.min_stock} {UNIT_LABELS[part.unit]}{low ? ' · bestill mer' : ''}
              </div>
            )}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${part.part_type === 'consumable' ? 'bg-skyBg text-sky' : 'bg-mossBg text-moss'}`}>
            {part.part_type === 'consumable' ? 'Forbruk' : 'Utstyrsspesifikk'}
          </span>
        </div>

        {/* Handlinger */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button onClick={() => setAction('in')} className="flex items-center justify-center gap-1.5 bg-moss text-white rounded-[12px] py-2.5 text-[13px] font-semibold"><FaPlus className="text-[11px]" /> Innkjøp</button>
            <button onClick={() => setAction('out')} className="flex items-center justify-center gap-1.5 bg-ink text-paper rounded-[12px] py-2.5 text-[13px] font-semibold"><FaMinus className="text-[11px]" /> Forbruk</button>
            <button onClick={() => setAction('correction')} className="flex items-center justify-center gap-1.5 bg-paper border border-line text-ink rounded-[12px] py-2.5 text-[13px] font-semibold"><FaBalanceScale className="text-[11px]" /> Tell opp</button>
          </div>
        )}
      </div>

      {/* Passer til */}
      {part.part_type === 'equipment_specific' && (
        <div>
          <h3 className="font-serif text-[16px] font-medium text-ink mb-2">Passer til</h3>
          {compat.length === 0 ? (
            <p className="text-[13px] text-ink3">Ikke knyttet til noe utstyr ennå — rediger delen for å koble den.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {compat.map((c) => (
                <Link key={c.equipment_id} href={`/equipment/${c.equipment_id}`} className="bg-paper border border-line rounded-full px-3 py-1.5 text-[13px] text-ink">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bevegelser */}
      <div>
        <h3 className="font-serif text-[16px] font-medium text-ink mb-2">Historikk</h3>
        {movements.length === 0 ? (
          <p className="text-[13px] text-ink3">Ingen bevegelser ennå.</p>
        ) : (
          <div className="bg-paper border border-line rounded-[16px] overflow-hidden">
            {movements.map((m, i) => {
              const sign = m.movement_type === 'out' ? '−' : m.movement_type === 'correction' && m.quantity < 0 ? '' : '+';
              return (
                <div key={m.id} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <div className="min-w-0">
                    <div className="text-[14px] text-ink font-medium">{MOVEMENT_LABELS[m.movement_type]}</div>
                    <div className="text-[12px] text-ink3">
                      {new Date(m.created_at).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {m.notes ? ` · ${m.notes}` : ''}
                    </div>
                  </div>
                  <div className={`text-[14px] font-semibold ${m.movement_type === 'out' ? 'text-rust' : 'text-moss'}`}>
                    {sign}{Math.abs(m.quantity)} {UNIT_LABELS[part.unit]}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slett */}
      {isAdmin && (
        <button
          onClick={async () => {
            if (!confirm('Slette denne delen og all historikk?')) return;
            await deletePart(part.id);
            router.push('/parts');
          }}
          className="inline-flex items-center gap-2 text-rust text-sm font-medium"
        >
          <FaTrash className="text-xs" /> Slett del
        </button>
      )}

      <div className="h-6" />

      {showEdit && (
        <PartModal part={part} equipment={equipment} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); router.refresh(); }} />
      )}
      {showLabel && <PartLabelModal part={part} compat={compat} onClose={() => setShowLabel(false)} />}
      {action && (
        <MovementModal
          part={part}
          type={action}
          equipment={equipment}
          onClose={() => setAction(null)}
          onSuccess={() => { setAction(null); router.refresh(); load(); }}
        />
      )}
    </div>
  );
}

function MovementModal({
  part, type, equipment, onClose, onSuccess,
}: {
  part: Part;
  type: MovementType;
  equipment: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState(part.unit_cost != null ? String(part.unit_cost) : '');
  const [equipmentId, setEquipmentId] = useState('');
  const [counted, setCounted] = useState(String(part.current_stock));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = type === 'in' ? 'Registrer innkjøp' : type === 'out' ? 'Registrer forbruk' : 'Tell opp (inventur)';

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const parse = (v: string) => parseFloat(v.replace(',', '.'));
      if (type === 'correction') {
        const c = parse(counted);
        if (isNaN(c)) { setError('Ugyldig antall'); setLoading(false); return; }
        const delta = c - part.current_stock;
        if (delta === 0) { onSuccess(); return; }
        await addMovement({ partId: part.id, type: 'correction', quantity: delta, notes: notes || `Inventur ${new Date().toLocaleDateString('nb-NO')}` });
      } else {
        const q = parse(qty);
        if (isNaN(q) || q <= 0) { setError('Ugyldig antall'); setLoading(false); return; }
        await addMovement({
          partId: part.id,
          type,
          quantity: q,
          unitCost: type === 'in' ? (cost.trim() ? parse(cost) : null) : null,
          equipmentId: type === 'out' ? (equipmentId || null) : null,
          notes: notes || (type === 'in' ? 'Innkjøp' : 'Forbruk'),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Movement error:', err);
      setError('Kunne ikke lagre.');
    } finally {
      setLoading(false);
    }
  };

  const cls = 'w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Lukk" className="p-2 text-gray-500 text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{error}</div>}
          {type === 'correction' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Faktisk antall på lager ({UNIT_LABELS[part.unit]})</label>
              <input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" className={cls} autoFocus />
              <p className="text-xs text-gray-500 mt-1">Nåværende registrert: {part.current_stock}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Antall ({UNIT_LABELS[part.unit]})</label>
                <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className={cls} autoFocus placeholder="0" />
              </div>
              {type === 'in' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enhetspris (kr)</label>
                  <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" className={cls} />
                </div>
              )}
              {type === 'out' && equipment.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brukt på (valgfritt)</label>
                  <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} className={cls}>
                    <option value="">— ingen —</option>
                    {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notat</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={cls} placeholder="Valgfritt" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl">Avbryt</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-3 bg-ink text-paper font-semibold rounded-xl disabled:opacity-50">{loading ? 'Lagrer…' : 'Lagre'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
