'use client';

import { useState } from 'react';
import { FaTools, FaTimes } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';

interface Equipment {
  id: string;
  name: string;
  model: string | null;
}

interface LogMaintenanceModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogMaintenanceModal({ equipment, onClose, onSuccess }: LogMaintenanceModalProps) {
  const [typeValue, setTypeValue] = useState('');
  const [description, setDescription] = useState('');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Du må være innlogget for å logge vedlikehold');
        setLoading(false);
        return;
      }

      // First, create or get maintenance type
      let maintenanceTypeId = null;

      if (typeValue) {
        // Check if this type exists for this equipment
        const { data: existingType } = await supabase
          .from('maintenance_types')
          .select('id')
          .eq('equipment_id', equipment.id)
          .eq('type_name', typeValue)
          .single();

        if (existingType) {
          maintenanceTypeId = existingType.id;
        } else {
          // Create new maintenance type
          const { data: newType, error: typeError } = await supabase
            .from('maintenance_types')
            .insert({
              equipment_id: equipment.id,
              type_name: typeValue,
            })
            .select()
            .single();

          if (typeError) throw typeError;
          maintenanceTypeId = newType.id;
        }
      }

      // Create maintenance log with current user as performed_by
      const { error: logError } = await supabase
        .from('maintenance_logs')
        .insert({
          equipment_id: equipment.id,
          maintenance_type_id: maintenanceTypeId,
          description: description || null,
          performed_date: performedDate,
          performed_by: user.id,
        });

      if (logError) throw logError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error logging maintenance:', err);
      setError(err.message || 'Kunne ikke logge vedlikehold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Logg Vedlikehold</h2>
            <p className="text-sm text-gray-600 mt-1">{equipment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type arbeid <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="F.eks. Smøring, Oljeskift, Rust-inspeksjon"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tips: Oljeskift, Smøring, Rust-inspeksjon, Dekktrykk, Filterskift
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

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !typeValue}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Lagrer...</span>
              ) : (
                <>
                  <FaTools />
                  <span>Logg</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
