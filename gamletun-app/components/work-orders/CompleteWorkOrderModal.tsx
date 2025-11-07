'use client';

import { useState } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';
import { completeWorkOrder, WorkOrder, ChecklistItem } from '@/lib/work-orders';

interface CompleteWorkOrderModalProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompleteWorkOrderModal({ workOrder, onClose, onSuccess }: CompleteWorkOrderModalProps) {
  const [comment, setComment] = useState('');
  const [actualHours, setActualHours] = useState(workOrder.estimated_hours?.toString() || '');
  const [actualCost, setActualCost] = useState(workOrder.estimated_cost?.toString() || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(workOrder.checklist || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleChecklistItem = (index: number) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setChecklist(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate checklist if exists
    if (checklist.length > 0) {
      const allCompleted = checklist.every(item => item.completed);
      if (!allCompleted) {
        setError('Alle punkter i sjekklisten må fullføres før arbeidsordren kan lukkes');
        setLoading(false);
        return;
      }
    }

    try {
      await completeWorkOrder(workOrder.id, {
        comment: comment || undefined,
        actual_hours: actualHours ? parseFloat(actualHours) : undefined,
        actual_cost: actualCost ? parseFloat(actualCost) : undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error completing work order:', err);
      setError(err.message || 'Kunne ikke fullføre arbeidsordre');
      setLoading(false);
    }
  };

  const allChecklistCompleted = checklist.length === 0 || checklist.every(item => item.completed);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <FaCheck className="text-2xl text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Fullfør arbeidsordre</h2>
              <p className="text-sm text-gray-600">{workOrder.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">Informasjon</p>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Utstyr: {workOrder.equipment?.name}</p>
              <p>Type: {workOrder.type === 'scheduled' ? 'Planlagt vedlikehold' : workOrder.type === 'corrective' ? 'Feilretting' : 'Inspeksjon'}</p>
              {workOrder.is_recurring && (
                <p className="font-semibold">Dette er en gjentagende oppgave - ny ordre vil bli opprettet automatisk</p>
              )}
            </div>
          </div>

          {/* Checklist */}
          {checklist.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Sjekkliste <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {checklist.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                      item.completed
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(index)}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'text-gray-600 line-through' : 'text-gray-900 font-medium'}`}>
                      {item.task}
                    </span>
                    {item.completed && (
                      <FaCheck className="text-green-600" />
                    )}
                  </div>
                ))}
              </div>
              {!allChecklistCompleted && (
                <p className="text-xs text-orange-600 mt-2">
                  Alle punkter må fullføres før arbeidsordren kan lukkes
                </p>
              )}
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kommentar
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Beskriv hva som ble gjort, hvilke deler som ble byttet, etc..."
            />
          </div>

          {/* Actual Hours and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Faktiske timer
              </label>
              <input
                type="number"
                step="0.5"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all min-h-[44px]"
                placeholder={workOrder.estimated_hours ? `Estimert: ${workOrder.estimated_hours}` : 'F.eks. 2.5'}
              />
              {workOrder.estimated_hours && actualHours && (
                <p className="text-xs text-gray-600 mt-1">
                  Estimert: {workOrder.estimated_hours} timer
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Faktisk kostnad (kr)
              </label>
              <input
                type="number"
                step="100"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all min-h-[44px]"
                placeholder={workOrder.estimated_cost ? `Estimert: ${workOrder.estimated_cost}` : 'F.eks. 5000'}
              />
              {workOrder.estimated_cost && actualCost && (
                <p className="text-xs text-gray-600 mt-1">
                  Estimert: {workOrder.estimated_cost} kr
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !allChecklistCompleted}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <span>Fullfører...</span>
              ) : (
                <>
                  <FaCheck />
                  <span>Fullfør arbeidsordre</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
