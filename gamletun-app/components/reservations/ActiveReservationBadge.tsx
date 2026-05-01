'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsCurrentUser(user?.id === reservation.user_id);
    };
    checkUser();
  }, [reservation.user_id]);

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
    <div className="bg-paper border border-sky/30 rounded-[16px] p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isStarted ? 'bg-sky animate-pulse' : 'bg-rust'}`} />
            <h3 className="text-lg font-bold text-ink">
              {isStarted ? 'I bruk nå' : 'Reservert fremover'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-ink2">
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
                className="px-4 py-2 bg-moss text-white rounded-[12px] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
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
                className="px-4 py-2 bg-rust text-white rounded-[12px] active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
                title="Avbryt reservasjon"
              >
                Avbryt
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-ink2">
          <FaClock className="text-xs" />
          <span>
            Fra: <span className="font-medium text-ink">{formatDate(reservation.start_time)}</span>
          </span>
        </div>
        {reservation.end_time && (
          <div className="flex items-center gap-2 text-ink2">
            <FaClock className="text-xs" />
            <span>
              Til: <span className={`font-medium ${isPast ? 'text-rust' : 'text-ink'}`}>
                {formatDate(reservation.end_time)}
                {isPast && ' (Utgått)'}
              </span>
            </span>
          </div>
        )}
        {!reservation.end_time && (
          <div className="flex items-center gap-2 text-ink2">
            <FaClock className="text-xs" />
            <span>Sluttid: <span className="font-medium text-ink">Ikke angitt</span></span>
          </div>
        )}
        {reservation.notes && (
          <div className="mt-3 pt-3 border-t border-line">
            <p className="text-ink2 italic">&quot;{reservation.notes}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
