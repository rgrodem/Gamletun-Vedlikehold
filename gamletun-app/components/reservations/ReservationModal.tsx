'use client';

import { useState } from 'react';
import { FaTimes, FaClock, FaCalendarAlt, FaUser } from 'react-icons/fa';
import { createReservation, checkAvailability } from '@/lib/reservations';

interface Equipment {
  id: string;
  name: string;
  model: string | null;
}

interface ReservationModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReservationModal({ equipment, onClose, onSuccess }: ReservationModalProps) {
  const [mode, setMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [hasEndTime, setHasEndTime] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const handleCheckAvailability = async () => {
    setError('');
    setLoading(true);

    try {
      let start: Date;
      let end: Date | null = null;

      if (mode === 'immediate') {
        start = new Date();
        if (hasEndTime && endDate) {
          end = new Date(`${endDate}T${endTime}`);
        }
      } else {
        start = new Date(`${startDate}T${startTime}`);
        if (hasEndTime && endDate) {
          end = new Date(`${endDate}T${endTime}`);
        }
      }

      // Validate dates
      if (end && end <= start) {
        setError('Sluttid må være etter starttid');
        setLoading(false);
        return;
      }

      const availability = await checkAvailability(equipment.id, start, end);

      if (!availability.available) {
        const conflictUser = availability.conflictingReservation?.user_profile?.full_name || 'Ukjent';
        const conflictStart = availability.conflictingReservation?.start_time
          ? new Date(availability.conflictingReservation.start_time).toLocaleString('nb-NO')
          : '';
        const conflictEnd = availability.conflictingReservation?.end_time
          ? new Date(availability.conflictingReservation.end_time).toLocaleString('nb-NO')
          : 'Ikke angitt';

        setError(
          `Utstyret er ikke tilgjengelig i denne perioden.\n` +
          `Reservert av: ${conflictUser}\n` +
          `Fra: ${conflictStart}\n` +
          `Til: ${conflictEnd}`
        );
        setAvailabilityChecked(false);
      } else {
        setAvailabilityChecked(true);
      }
    } catch (err: any) {
      console.error('Error checking availability:', err);
      setError(err.message || 'Kunne ikke sjekke tilgjengelighet');
      setAvailabilityChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!availabilityChecked) {
      setError('Vennligst sjekk tilgjengelighet først');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let start: string;
      let end: string | null = null;

      if (mode === 'immediate') {
        start = new Date().toISOString();
        if (hasEndTime && endDate) {
          end = new Date(`${endDate}T${endTime}`).toISOString();
        }
      } else {
        start = new Date(`${startDate}T${startTime}`).toISOString();
        if (hasEndTime && endDate) {
          end = new Date(`${endDate}T${endTime}`).toISOString();
        }
      }

      await createReservation({
        equipment_id: equipment.id,
        start_time: start,
        end_time: end,
        notes: notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError(err.message || 'Kunne ikke opprette reservasjon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">Reserver Utstyr</h2>
            <p className="text-sm text-white/90 mt-1">{equipment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Lukk"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Når skal du bruke utstyret?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('immediate');
                  setAvailabilityChecked(false);
                }}
                className={`p-4 border-2 rounded-xl transition-all ${
                  mode === 'immediate'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FaClock className="text-2xl mx-auto mb-2" />
                <p className="font-semibold">Nå</p>
                <p className="text-xs mt-1">Start umiddelbart</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('scheduled');
                  setAvailabilityChecked(false);
                }}
                className={`p-4 border-2 rounded-xl transition-all ${
                  mode === 'scheduled'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FaCalendarAlt className="text-2xl mx-auto mb-2" />
                <p className="font-semibold">Planlegg</p>
                <p className="text-xs mt-1">Reserver fremover</p>
              </button>
            </div>
          </div>

          {/* Scheduled Start Time */}
          {mode === 'scheduled' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Når starter du? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setAvailabilityChecked(false);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setAvailabilityChecked(false);
                  }}
                  required
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          {/* End Time Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEndTime}
                onChange={(e) => {
                  setHasEndTime(e.target.checked);
                  setAvailabilityChecked(false);
                }}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Jeg vet når jeg er ferdig
              </span>
            </label>
          </div>

          {/* End Time */}
          {hasEndTime && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Når er du ferdig? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setAvailabilityChecked(false);
                  }}
                  min={mode === 'scheduled' ? startDate : new Date().toISOString().split('T')[0]}
                  required
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setAvailabilityChecked(false);
                  }}
                  required
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notat (valgfritt)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="F.eks. hva du skal bruke utstyret til..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Availability Confirmed */}
          {availabilityChecked && !error && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 text-sm font-medium">✓ Utstyret er tilgjengelig</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {!availabilityChecked ? (
              <button
                type="button"
                onClick={handleCheckAvailability}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sjekker...' : 'Sjekk tilgjengelighet'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Reserverer...' : 'Bekreft reservasjon'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
