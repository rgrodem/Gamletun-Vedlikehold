'use client';

import { useEffect, useState } from 'react';
import { FaBoxes, FaPlus, FaUndo } from 'react-icons/fa';
import {
  Part,
  WorkOrderStockUsage,
  UNIT_LABELS,
  getSelectablePartsForWorkOrder,
  getWorkOrderStockUsage,
  addMovement,
  deleteMovement,
} from '@/lib/parts';

interface WorkOrderStockSectionProps {
  workOrderId: string;
  equipmentId: string | null;
  readOnly?: boolean;
}

/**
 * Forbruk fra varelageret på en arbeidsordre. Velg en del som finnes på lager,
 * registrer antall — beholdningen trekkes ned med en gang (movement 'out').
 * Lukker loopen kjøp → lager → forbruk, og kobler kostnaden til ordren.
 */
export default function WorkOrderStockSection({ workOrderId, equipmentId, readOnly = false }: WorkOrderStockSectionProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [usage, setUsage] = useState<WorkOrderStockUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [selectable, used] = await Promise.all([
        getSelectablePartsForWorkOrder(equipmentId),
        getWorkOrderStockUsage(workOrderId),
      ]);
      setParts(selectable);
      setUsage(used);
    } catch (err) {
      console.error('Error loading stock usage:', err);
      setError('Kunne ikke laste lagerdeler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, equipmentId]);

  const selectedPart = parts.find((p) => p.id === selectedId) || null;

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return v.trim() && !isNaN(n) ? n : 0;
  };

  const handleAdd = async () => {
    const qty = num(quantity);
    if (!selectedPart || qty <= 0) return;
    setSaving(true);
    setError('');
    try {
      await addMovement({
        partId: selectedPart.id,
        type: 'out',
        quantity: qty,
        unitCost: selectedPart.unit_cost,
        workOrderId,
        equipmentId,
        notes: 'Brukt på arbeidsordre',
      });
      setSelectedId('');
      setQuantity('1');
      await load();
    } catch (err) {
      console.error('Error registering consumption:', err);
      setError('Kunne ikke registrere forbruk');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async (id: string) => {
    setError('');
    try {
      await deleteMovement(id);
      await load();
    } catch (err) {
      console.error('Error undoing consumption:', err);
      setError('Kunne ikke angre forbruk');
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-16" />;
  }

  if (usage.length === 0 && readOnly) return null;

  const totalCost = usage.reduce(
    (sum, u) => sum + (u.unit_cost != null ? u.unit_cost * u.quantity : 0) * (u.movement_type === 'return' ? -1 : 1),
    0
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <FaBoxes className="text-gray-500" /> Brukt fra lager ({usage.length})
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {usage.length > 0 && (
        <div className="space-y-2 mb-3">
          {usage.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {u.movement_type === 'return' ? 'Retur: ' : ''}
                  {u.quantity} {u.part ? UNIT_LABELS[u.part.unit] : 'stk'} × {u.part?.name || 'Slettet del'}
                </p>
                {u.unit_cost != null && (
                  <p className="text-xs text-gray-500">{Math.round(u.unit_cost * u.quantity)} kr</p>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleUndo(u.id)}
                  className="p-2 text-gray-500 rounded-lg hover:bg-gray-200"
                  aria-label="Angre forbruk"
                  title="Angre — legger delen tilbake på lager"
                >
                  <FaUndo className="text-[12px]" />
                </button>
              )}
            </div>
          ))}
          {totalCost > 0 && (
            <p className="text-xs text-gray-600 text-right pr-1">
              Deler totalt: <span className="font-semibold">{Math.round(totalCost)} kr</span>
            </p>
          )}
        </div>
      )}

      {!readOnly && (
        parts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Ingen deler på lager ennå. Legg inn deler under <span className="font-medium">Varelager</span> først.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              <option value="">Velg del fra lager…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.current_stock <= 0}>
                  {p.name} — {p.current_stock} {UNIT_LABELS[p.unit]} på lager
                  {p.current_stock <= 0 ? ' (tomt)' : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center"
                aria-label="Antall"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || !selectedPart || num(quantity) <= 0}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FaPlus className="text-[11px]" /> Bruk
              </button>
            </div>
          </div>
        )
      )}
      {!readOnly && selectedPart && (
        <p className="text-xs text-gray-500 mt-1.5">
          Trekker {num(quantity) || 0} {UNIT_LABELS[selectedPart.unit]} fra «{selectedPart.name}»
          {selectedPart.unit_cost != null && ` · ${Math.round(selectedPart.unit_cost * (num(quantity) || 0))} kr`}
        </p>
      )}
    </div>
  );
}
