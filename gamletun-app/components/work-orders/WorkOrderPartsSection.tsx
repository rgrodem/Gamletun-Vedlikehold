'use client';

import { useEffect, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import {
  WorkOrderPart,
  PartStatus,
  getWorkOrderParts,
  addWorkOrderPart,
  updateWorkOrderPartStatus,
  deleteWorkOrderPart,
  partStatusLabels,
  nextPartStatus,
} from '@/lib/work-order-parts';

const STATUS_STYLE: Record<PartStatus, string> = {
  needed: 'bg-amber-100 text-amber-800 border-amber-300',
  ordered: 'bg-blue-100 text-blue-800 border-blue-300',
  received: 'bg-green-100 text-green-800 border-green-300',
};

interface WorkOrderPartsSectionProps {
  workOrderId: string;
  readOnly?: boolean;
}

/**
 * Deleliste på en arbeidsordre: hva trengs, hva er bestilt, hva er mottatt.
 * Trykk på status-chipen for å flytte delen til neste steg.
 */
export default function WorkOrderPartsSection({ workOrderId, readOnly = false }: WorkOrderPartsSectionProps) {
  const [parts, setParts] = useState<WorkOrderPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWorkOrderParts(workOrderId)
      .then((data) => { if (!cancelled) setParts(data); })
      .catch((err) => console.error('Error loading parts:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workOrderId]);

  const handleAdd = async () => {
    const name = newName.trim();
    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1);
    if (!name) return;

    setSaving(true);
    setError('');
    try {
      const part = await addWorkOrderPart(workOrderId, name, quantity);
      setParts(prev => [...prev, part]);
      setNewName('');
      setNewQuantity('1');
    } catch (err) {
      console.error('Error adding part:', err);
      setError('Kunne ikke legge til del');
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (part: WorkOrderPart) => {
    const status = nextPartStatus[part.status];
    // Oppdater optimistisk; rull tilbake hvis kallet feiler.
    setParts(prev => prev.map(p => (p.id === part.id ? { ...p, status } : p)));
    try {
      await updateWorkOrderPartStatus(part.id, status);
    } catch (err) {
      console.error('Error updating part status:', err);
      setParts(prev => prev.map(p => (p.id === part.id ? { ...p, status: part.status } : p)));
      setError('Kunne ikke oppdatere status');
    }
  };

  const handleDelete = async (partId: string) => {
    try {
      await deleteWorkOrderPart(partId);
      setParts(prev => prev.filter(p => p.id !== partId));
    } catch (err) {
      console.error('Error deleting part:', err);
      setError('Kunne ikke slette del');
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-16" />;
  }

  if (parts.length === 0 && readOnly) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Deler ({parts.length})
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {parts.length > 0 && (
        <div className="space-y-2 mb-3">
          {parts.map((part) => (
            <div
              key={part.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {part.quantity > 1 ? `${part.quantity} × ` : ''}{part.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !readOnly && handleCycleStatus(part)}
                disabled={readOnly}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLE[part.status]} ${
                  readOnly ? 'cursor-default' : 'hover:opacity-80'
                }`}
                title={readOnly ? undefined : `Trykk for å endre til ${partStatusLabels[nextPartStatus[part.status]]}`}
              >
                {partStatusLabels[part.status]}
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(part.id)}
                  className="p-2 text-red-600 rounded-lg hover:bg-red-50"
                  aria-label="Slett del"
                >
                  <FaTrash className="text-[12px]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="F.eks. Oljefilter"
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <input
            type="number"
            min={1}
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center"
            aria-label="Antall"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-1.5"
          >
            <FaPlus className="text-[11px]" /> Legg til
          </button>
        </div>
      )}
    </div>
  );
}
