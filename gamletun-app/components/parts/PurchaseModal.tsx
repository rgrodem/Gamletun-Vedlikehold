'use client';

import { useState } from 'react';
import { FaTimes, FaMagic, FaPlus, FaTrash } from 'react-icons/fa';
import { Part, PartType, PartUnit, createPart, setPartCompatibility, addMovement } from '@/lib/parts';
import { fileToBase64 } from '@/lib/file-to-base64';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface Props {
  parts: Part[];
  equipment: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Line {
  key: string;
  existingPartId: string | null;
  name: string;
  partNumber: string;
  quantity: string;
  unit: PartUnit;
  unitCost: string;
  category: string;
  partType: PartType;
  equipmentIds: string[];
}

let lineCounter = 0;
const newLine = (over: Partial<Line> = {}): Line => ({
  key: `l${lineCounter++}`,
  existingPartId: null,
  name: '',
  partNumber: '',
  quantity: '1',
  unit: 'stk',
  unitCost: '',
  category: '',
  partType: 'consumable',
  equipmentIds: [],
  ...over,
});

export default function PurchaseModal({ parts, equipment, onClose, onSuccess }: Props) {
  useModalBehavior(onClose);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiNote, setAiNote] = useState('');

  const update = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const matchEquipmentNames = (names: string[]): string[] =>
    equipment.filter((e) => names.some((n) => n.toLowerCase() === e.name.toLowerCase())).map((e) => e.id);

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setAiLoading(true);
    setError('');
    setAiNote('');
    try {
      const usable = files.filter((f) => f.size <= 25 * 1024 * 1024).slice(0, 6);
      const documents = await Promise.all(
        usable.map(async (f) => ({
          data: await fileToBase64(f),
          mediaType: f.type,
          kind: f.type === 'application/pdf' ? 'pdf' : 'image',
        }))
      );
      const res = await fetch('/api/ai/parse-receipt-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, equipmentNames: equipment.map((e) => e.name) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Kunne ikke lese kvitteringen.');
        return;
      }
      const parsed: Line[] = (json.lines || []).map((l: Record<string, unknown>) => {
        const name = String(l.name || '');
        const pn = (l.partNumber as string) || '';
        // Forsøk å matche eksisterende del på delenummer eller navn.
        const match = parts.find(
          (p) =>
            (pn && p.part_number && p.part_number.toLowerCase() === pn.toLowerCase()) ||
            p.name.toLowerCase() === name.toLowerCase()
        );
        return newLine({
          existingPartId: match?.id ?? null,
          name: match?.name ?? name,
          partNumber: match?.part_number ?? pn,
          quantity: l.quantity != null ? String(l.quantity) : '1',
          unit: (match?.unit ?? (l.unit as PartUnit) ?? 'stk'),
          unitCost: l.unitCost != null ? String(l.unitCost) : '',
          category: match?.category ?? (l.category as string) ?? '',
          partType: (match?.part_type ?? (l.partType as PartType) ?? 'consumable'),
          equipmentIds: match ? [] : matchEquipmentNames((l.suggestedEquipment as string[]) || []),
        });
      });
      if (parsed.length === 0) {
        setAiNote('Fant ingen delelinjer i dokumentet — legg til manuelt.');
      } else {
        setLines(parsed);
        setAiNote(`Fant ${parsed.length} linjer — kontroller og bekreft.`);
      }
    } catch (err) {
      console.error('KI-kvittering feilet:', err);
      setError('Kunne ikke lese kvitteringen.');
    } finally {
      setAiLoading(false);
    }
  };

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return v.trim() && !isNaN(n) ? n : undefined;
  };

  const handleSave = async () => {
    const valid = lines.filter((l) => l.name.trim() && (num(l.quantity) ?? 0) > 0);
    if (valid.length === 0) {
      setError('Legg inn minst én linje med navn og antall.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const l of valid) {
        let partId = l.existingPartId;
        const cost = num(l.unitCost) ?? null;
        // Gjenbruk en vare som allerede finnes (samme delenummer eller navn) —
        // også om saldoen er 0 — i stedet for å opprette en dublett.
        if (!partId) {
          const pn = l.partNumber.trim().toLowerCase();
          const nm = l.name.trim().toLowerCase();
          const match = parts.find(
            (p) =>
              (pn && p.part_number?.toLowerCase() === pn) ||
              (nm && p.name.toLowerCase() === nm)
          );
          if (match) partId = match.id;
        }
        if (!partId) {
          const created = await createPart({
            name: l.name.trim(),
            part_number: l.partNumber.trim() || null,
            category: l.category.trim() || null,
            part_type: l.partType,
            unit: l.unit,
            unit_cost: cost,
          });
          partId = created.id;
          if (l.partType === 'equipment_specific' && l.equipmentIds.length > 0) {
            await setPartCompatibility(partId, l.equipmentIds);
          }
        }
        await addMovement({
          partId,
          type: 'in',
          quantity: num(l.quantity)!,
          unitCost: cost,
          notes: 'Innkjøp',
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving purchase:', err);
      setError('Kunne ikke lagre innkjøpet.');
    } finally {
      setSaving(false);
    }
  };

  const cls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Registrer innkjøp</h2>
          <button onClick={onClose} aria-label="Lukk" className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{error}</div>}

          <label className="block cursor-pointer bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center text-blue-700">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <FaMagic /> {aiLoading ? 'Leser kvittering…' : 'Les kvittering med KI (bilde/PDF)'}
            </span>
            <input type="file" onChange={handleReceipt} accept="image/*,.pdf" multiple disabled={aiLoading} className="hidden" />
          </label>
          {aiNote && <p className="text-xs text-green-700 -mt-2">{aiNote}</p>}

          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.key} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={l.name} onChange={(e) => update(l.key, { name: e.target.value, existingPartId: null })} placeholder="Delenavn" className={`${cls} flex-1 min-w-0`} />
                  <button type="button" onClick={() => remove(l.key)} className="p-2 text-red-600" aria-label="Fjern linje"><FaTrash className="text-xs" /></button>
                </div>
                {l.existingPartId && <p className="text-[11px] text-green-700">Finnes på lager — legger til beholdning.</p>}
                <div className="grid grid-cols-4 gap-2">
                  <input value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="decimal" placeholder="Antall" className={cls} />
                  <select value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value as PartUnit })} className={cls} disabled={!!l.existingPartId}>
                    {(['stk', 'liter', 'meter', 'kg'] as PartUnit[]).map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} inputMode="decimal" placeholder="Pris" className={cls} />
                  <input value={l.category} onChange={(e) => update(l.key, { category: e.target.value })} placeholder="Kategori" className={cls} disabled={!!l.existingPartId} />
                </div>
                {!l.existingPartId && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => update(l.key, { partType: l.partType === 'consumable' ? 'equipment_specific' : 'consumable' })}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${l.partType === 'consumable' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
                      {l.partType === 'consumable' ? 'Forbruk' : 'Utstyrsspesifikk'}
                    </button>
                    {l.partType === 'equipment_specific' && equipment.map((eq) => (
                      <button key={eq.id} type="button"
                        onClick={() => update(l.key, { equipmentIds: l.equipmentIds.includes(eq.id) ? l.equipmentIds.filter((x) => x !== eq.id) : [...l.equipmentIds, eq.id] })}
                        className={`px-2.5 py-1 rounded-full text-xs border ${l.equipmentIds.includes(eq.id) ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300'}`}>
                        {eq.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setLines((prev) => [...prev, newLine()])} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink border border-line rounded-lg px-3 py-2">
            <FaPlus className="text-[11px]" /> Legg til linje
          </button>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl">Avbryt</button>
            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-ink text-paper font-semibold rounded-xl disabled:opacity-50">
              {saving ? 'Lagrer…' : 'Registrer innkjøp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
