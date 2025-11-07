'use client';

import { useState } from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { createWorkOrder, WorkOrderPriority } from '@/lib/work-orders';

interface Equipment {
  id: string;
  name: string;
}

interface ReportFaultModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportFaultModal({ equipment, onClose, onSuccess }: ReportFaultModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createWorkOrder({
        equipment_id: equipment.id,
        type: 'corrective',
        priority,
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating fault report:', err);
      setError(err.message || 'Kunne ikke opprette feilmelding');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <FaExclamationTriangle className="text-2xl text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meld feil</h2>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
              placeholder="F.eks. Hydraulikk-lekkasje, Lys defekt, Motor starter ikke"
            />
            <p className="text-xs text-gray-500 mt-1">Kort beskrivelse av feilen</p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prioritet <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as WorkOrderPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all border-2 touch-manipulation min-h-[44px] ${
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-red-500 text-white border-red-600'
                        : p === 'high'
                        ? 'bg-orange-500 text-white border-orange-600'
                        : p === 'medium'
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-gray-500 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {p === 'urgent' ? 'Akutt' : p === 'high' ? 'Høy' : p === 'medium' ? 'Medium' : 'Lav'}
                </button>
              ))}
            </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detaljert beskrivelse av problemet..."
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Frist (valgfritt)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
            />
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
              disabled={loading || !title}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <span>Melder feil...</span>
              ) : (
                <>
                  <FaExclamationTriangle />
                  <span>Meld feil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
