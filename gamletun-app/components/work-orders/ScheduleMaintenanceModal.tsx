'use client';

import { useState } from 'react';
import { FaTimes, FaCalendarAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { createWorkOrder, ChecklistItem } from '@/lib/work-orders';

interface Equipment {
  id: string;
  name: string;
}

interface ScheduleMaintenanceModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleMaintenanceModal({ equipment, onClose, onSuccess }: ScheduleMaintenanceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState('');
  const [intervalHours, setIntervalHours] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, { task: newChecklistItem.trim(), completed: false }]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createWorkOrder({
        equipment_id: equipment.id,
        type: 'scheduled',
        priority: 'medium',
        title,
        description: description || undefined,
        due_date: dueDate,
        scheduled_date: dueDate,
        is_recurring: isRecurring,
        recurrence_interval_days: intervalDays ? parseInt(intervalDays) : undefined,
        recurrence_interval_hours: intervalHours ? parseInt(intervalHours) : undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error scheduling maintenance:', err);
      setError(err.message || 'Kunne ikke planlegge vedlikehold');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaCalendarAlt className="text-2xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Planlegg vedlikehold</h2>
              <p className="text-sm text-gray-600">{equipment.name}</p>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tittel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[44px]"
              placeholder="F.eks. Årlig service, Oljeskift, Smøring"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Beskriv vedlikeholdsoppgaven..."
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Forfallsdato <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[44px]"
            />
          </div>

          {/* Recurring */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isRecurring" className="text-sm font-semibold text-gray-900">
                Gjenta automatisk
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-3 pl-8">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 whitespace-nowrap">Hver</label>
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    min="1"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                  <span className="text-sm text-gray-700">dager</span>
                </div>
                <div className="text-xs text-gray-600">
                  Når denne oppgaven fullføres, opprettes en ny automatisk {intervalDays || 'X'} dager frem i tid.
                </div>
              </div>
            )}
          </div>

          {/* Estimates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estimert timer
              </label>
              <input
                type="number"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[44px]"
                placeholder="F.eks. 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estimert kostnad (kr)
              </label>
              <input
                type="number"
                step="100"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[44px]"
                placeholder="F.eks. 5000"
              />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sjekkliste (valgfritt)
            </label>
            <div className="space-y-2">
              {/* Existing items */}
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="flex-1 text-sm text-gray-900">{item.task}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              ))}

              {/* Add new item */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[44px]"
                  placeholder="Legg til oppgave..."
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors min-w-[44px] min-h-[44px]"
                >
                  <FaPlus />
                </button>
              </div>
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
              disabled={loading || !title || !dueDate}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <span>Planlegger...</span>
              ) : (
                <>
                  <FaCalendarAlt />
                  <span>Planlegg vedlikehold</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
