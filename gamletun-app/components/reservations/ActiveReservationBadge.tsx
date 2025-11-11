'use client';

import { useState } from 'react';
import { FaUser, FaClock, FaStopCircle } from 'react-icons/fa';
import { Reservation, completeReservation, cancelReservation } from '@/lib/reservations';
import { createClient } from '@/lib/supabase/client';

interface ActiveReservationBadgeProps {
  reservation: Reservation;
  onUpdate: () => void;
}

export default function ActiveReservationBadge({ reservation, onUpdate }: ActiveReservationBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Check if current user is the one who reserved
  useState(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsCurrentUser(user?.id === reservation.user_id);
    };
    checkUser();
  });

  const handleComplete = async () => {
    if (!confirm('Er du sikker på at du er ferdig med utstyret?')) return;

    setLoading(true);
    try {
      await completeReservation(reservation.id);
      onUpdate();
    } catch (error) {
      console.error('Error completing reservation:', error);
      alert('Kunne ikke avslutte reservasjonen');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Er du sikker på at du vil avbryte reservasjonen?')) return;

    setLoading(true);
    try {
      await cancelReservation(reservation.id);
      onUpdate();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Kunne ikke avbryte reservasjonen');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isStarted = new Date(reservation.start_time) <= new Date();
  const isPast = reservation.end_time && new Date(reservation.end_time) < new Date();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-5 shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-bold text-gray-900">
              {isStarted ? 'I Bruk' : 'Reservert'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <FaUser className="text-sm" />
            <span className="font-medium">
              {reservation.user_profile?.full_name || 'Ukjent bruker'}
            </span>
          </div>
        </div>
        {isCurrentUser && (
          <div className="flex gap-2">
            {isStarted && (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                title="Avslutt bruk"
              >
                <FaStopCircle />
                Avslutt
              </button>
            )}
            {!isStarted && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
                title="Avbryt reservasjon"
              >
                Avbryt
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <FaClock className="text-xs" />
          <span>
            Fra: <span className="font-medium text-gray-900">{formatDate(reservation.start_time)}</span>
          </span>
        </div>
        {reservation.end_time && (
          <div className="flex items-center gap-2 text-gray-600">
            <FaClock className="text-xs" />
            <span>
              Til: <span className={`font-medium ${isPast ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(reservation.end_time)}
                {isPast && ' (Utgått)'}
              </span>
            </span>
          </div>
        )}
        {!reservation.end_time && (
          <div className="flex items-center gap-2 text-gray-600">
            <FaClock className="text-xs" />
            <span>Sluttid: <span className="font-medium text-gray-900">Ikke angitt</span></span>
          </div>
        )}
        {reservation.notes && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-gray-700 italic">&quot;{reservation.notes}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
