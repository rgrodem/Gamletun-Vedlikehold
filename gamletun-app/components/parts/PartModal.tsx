'use client';

import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
  Part,
  PartType,
  PartUnit,
  createPart,
  updatePart,
  setPartCompatibility,
  getPartCompatibility,
} from '@/lib/parts';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface Props {
  equipment: { id: string; name: string }[];
  existingCategories?: string[];
  part?: Part | null; // redigering
  onClose: () => void;
  onSuccess: () => void;
}

const UNITS: PartUnit[] = ['stk', 'liter', 'meter', 'kg'];

export default function PartModal({ equipment, existingCategories = [], part, onClose, onSuccess }: Props) {
  useModalBehavior(onClose);
  const editing = !!part;

  const [name, setName] = useState(part?.name || '');
  const [partNumber, setPartNumber] = useState(part?.part_number || '');
  const [ean, setEan] = useState(part?.ean || '');
  const [category, setCategory] = useState(part?.category || '');
  const [partType, setPartType] = useState<PartType>(part?.part_type || 'consumable');
  const [unit, setUnit] = useState<PartUnit>(part?.unit || 'stk');
  const [location, setLocation] = useState(part?.location || '');
  const [minStock, setMinStock] = useState(part ? String(part.min_stock) : '');
  const [unitCost, setUnitCost] = useState(part?.unit_cost != null ? String(part.unit_cost) : '');
  const [notes, setNotes] = useState(part?.notes || '');
  const [compatIds, setCompatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (part) {
      getPartCompatibility(part.id)
        .then((rows) => setCompatIds(rows.map((r) => r.equipment_id)))
        .catch(() => {});
    }
  }, [part]);

  const toggleCompat = (id: string) =>
    setCompatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return v.trim() && !isNaN(n) ? n : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        part_number: partNumber.trim() || null,
        ean: ean.trim() || null,
        category: category.trim() || null,
        part_type: partType,
        unit,
        location: location.trim() || null,
        min_stock: num(minStock) ?? 0,
        unit_cost: num(unitCost) ?? null,
        notes: notes.trim() || null,
      };
      let id = part?.id;
      if (editing && id) {
        await updatePart(id, payload);
      } else {
        const created = await createPart(payload);
        id = created.id;
      }
      // Kompatibilitet gjelder kun utstyrsspesifikke deler.
      if (id) {
        await setPartCompatibility(id, partType === 'equipment_specific' ? compatIds : []);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving part:', err);
      setError('Kunne ikke lagre delen.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{editing ? 'Rediger del' : 'Ny del'}</h2>
          <button onClick={onClose} aria-label="Lukk" className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Navn <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="F.eks. Oljefilter Mahle OX 420D" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPartType('consumable')}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium ${partType === 'consumable' ? 'bg-blue-500 text-white border-blue-600' : 'bg-white border-gray-300'}`}>
                Forbruk (felles)
              </button>
              <button type="button" onClick={() => setPartType('equipment_specific')}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium ${partType === 'equipment_specific' ? 'bg-green-600 text-white border-green-700' : 'bg-white border-gray-300'}`}>
                Utstyrsspesifikk
              </button>
            </div>
          </div>

          {/* Kompatibilitet (kun utstyrsspesifikk) */}
          {partType === 'equipment_specific' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Passer til utstyr</label>
              <p className="text-xs text-gray-500 mb-2">Velg hvilke maskiner delen passer — så vet du alltid hva du har på lager.</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {equipment.map((eq) => (
                  <button key={eq.id} type="button" onClick={() => toggleCompat(eq.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${compatIds.includes(eq.id) ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}>
                    {eq.name}
                  </button>
                ))}
                {equipment.length === 0 && <p className="text-sm text-gray-500">Ingen utstyr registrert.</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enhet</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as PartUnit)} className={inputCls}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} list="part-categories" className={inputCls} placeholder="filter, olje…" />
              <datalist id="part-categories">
                {existingCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delenummer</label>
              <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={inputCls} placeholder="OX 420D" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">EAN / strekkode</label>
              <input value={ean} onChange={(e) => setEan(e.target.value)} className={inputCls} inputMode="numeric" placeholder="730…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hylle</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="A3" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min. beh.</label>
              <input value={minStock} onChange={(e) => setMinStock(e.target.value)} inputMode="decimal" className={inputCls} placeholder="2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pris (kr)</label>
              <input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" className={inputCls} placeholder="145" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl">Avbryt</button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-6 py-3 bg-ink text-paper font-semibold rounded-xl disabled:opacity-50">
              {loading ? 'Lagrer…' : editing ? 'Lagre' : 'Opprett del'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
