'use client';

import { useState } from 'react';
import { FaTools, FaTimes, FaTrash } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';

interface MaintenanceLog {
  id: string;
  description: string | null;
  performed_date: string;
  maintenance_type: {
    type_name: string;
  } | null;
}

interface EditMaintenanceModalProps {
  log: MaintenanceLog;
  equipmentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMaintenanceModal({ log, equipmentName, onClose, onSuccess }: EditMaintenanceModalProps) {
  const [typeValue, setTypeValue] = useState(log.maintenance_type?.type_name || '');
  const [description, setDescription] = useState(log.description || '');
  const [performedDate, setPerformedDate] = useState(log.performed_date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Update maintenance log
      const { error: updateError } = await supabase
        .from('maintenance_logs')
        .update({
          description: description || null,
          performed_date: performedDate,
        })
        .eq('id', log.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating maintenance:', err);
      setError(err.message || 'Kunne ikke oppdatere vedlikehold');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('id', log.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting maintenance:', err);
      setError(err.message || 'Kunne ikke slette vedlikehold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Rediger Vedlikehold</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{equipmentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-lg sm:text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Type - Read only */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type arbeid
            </label>
            <input
              type="text"
              value={typeValue}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Type kan ikke endres etter opprettelse
            </p>
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
              placeholder="Beskriv hva som ble gjort..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dato utført <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={performedDate}
              onChange={(e) => setPerformedDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm sm:text-base text-red-900 font-semibold mb-3">Er du sikker på at du vil slette dette vedlikeholdet?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors font-medium touch-manipulation min-h-[44px]"
                  aria-label="Avbryt sletting"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                  aria-label="Bekreft sletting"
                >
                  {loading ? 'Sletter...' : 'Slett'}
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading || showDeleteConfirm}
              className="px-6 py-3 border-2 border-red-300 text-red-700 font-semibold rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
              aria-label="Slett vedlikehold"
            >
              <FaTrash />
              <span>Slett</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
              aria-label="Avbryt og lukk"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || showDeleteConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
              aria-label="Lagre endringer"
            >
              {loading ? (
                <span>Lagrer...</span>
              ) : (
                <>
                  <FaTools />
                  <span>Lagre</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
