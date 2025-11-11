'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaCalendarAlt, FaClock, FaCheckCircle, FaBan, FaHourglass } from 'react-icons/fa';
import { Reservation, completeReservation, cancelReservation } from '@/lib/reservations';
import { useRouter } from 'next/navigation';

interface MyReservationsClientProps {
  reservations: Reservation[];
}

export default function MyReservationsClient({ reservations }: MyReservationsClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleComplete = async (reservationId: string) => {
    if (!confirm('Er du sikker på at du er ferdig med utstyret?')) return;

    setLoading(reservationId);
    try {
      await completeReservation(reservationId);
      router.refresh();
    } catch (error) {
      console.error('Error completing reservation:', error);
      alert('Kunne ikke avslutte reservasjonen');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!confirm('Er du sikker på at du vil avbryte reservasjonen?')) return;

    setLoading(reservationId);
    try {
      await cancelReservation(reservationId);
      router.refresh();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Kunne ikke avbryte reservasjonen');
    } finally {
      setLoading(null);
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

  const activeReservations = reservations.filter(r => r.status === 'active');
  const completedReservations = reservations.filter(r => r.status === 'completed');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Fullført';
      case 'cancelled':
        return 'Avbrutt';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <FaHourglass />;
      case 'completed':
        return <FaCheckCircle />;
      case 'cancelled':
        return <FaBan />;
      default:
        return null;
    }
  };

  const renderReservationCard = (reservation: Reservation) => {
    const isStarted = new Date(reservation.start_time) <= new Date();
    const isPast = reservation.end_time && new Date(reservation.end_time) < new Date();
    const isActive = reservation.status === 'active';

    return (
      <div key={reservation.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start gap-4 mb-4">
          {/* Equipment Image/Icon */}
          {reservation.equipment?.image_url ? (
            <div className="relative w-16 h-16 rounded-xl shadow-md overflow-hidden flex-shrink-0">
              <Image
                src={reservation.equipment.image_url}
                alt={reservation.equipment.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : reservation.equipment?.category ? (
            <div
              className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: `linear-gradient(to bottom right, ${reservation.equipment.category.color}, ${reservation.equipment.category.color}dd)`
              }}
            >
              {reservation.equipment.category.icon}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl bg-gray-200 flex-shrink-0">
              🏗️
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/equipment/${reservation.equipment_id}`}
              className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors block truncate"
            >
              {reservation.equipment?.name || 'Ukjent utstyr'}
            </Link>
            {reservation.equipment?.model && (
              <p className="text-sm text-gray-600">{reservation.equipment.model}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(reservation.status)}`}>
                {getStatusIcon(reservation.status)}
                {getStatusText(reservation.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Time Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <FaClock className="text-xs" />
            <span>Fra: <span className="font-medium text-gray-900">{formatDate(reservation.start_time)}</span></span>
          </div>
          {reservation.end_time ? (
            <div className="flex items-center gap-2 text-gray-600">
              <FaClock className="text-xs" />
              <span>
                Til: <span className={`font-medium ${isPast ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(reservation.end_time)}
                  {isPast && ' (Utgått)'}
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <FaClock className="text-xs" />
              <span>Sluttid: <span className="font-medium text-gray-900">Ikke angitt</span></span>
            </div>
          )}
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 italic">&quot;{reservation.notes}&quot;</p>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <div className="flex gap-2">
            {isStarted && (
              <button
                onClick={() => handleComplete(reservation.id)}
                disabled={loading === reservation.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
              >
                {loading === reservation.id ? 'Avslutter...' : 'Avslutt bruk'}
              </button>
            )}
            {!isStarted && (
              <button
                onClick={() => handleCancel(reservation.id)}
                disabled={loading === reservation.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
              >
                {loading === reservation.id ? 'Avbryter...' : 'Avbryt reservasjon'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <FaArrowLeft />
            <span>Tilbake til oversikt</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <FaCalendarAlt className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mine Reservasjoner</h1>
              <p className="text-gray-600 mt-1">Oversikt over dine utstyrsreservasjoner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reservations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <FaCalendarAlt className="text-6xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingen reservasjoner</h2>
            <p className="text-gray-600 mb-6">Du har ikke reservert noe utstyr ennå</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Gå til oversikten
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Reservations */}
            {activeReservations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaHourglass className="text-blue-600" />
                  Aktive ({activeReservations.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeReservations.map(renderReservationCard)}
                </div>
              </div>
            )}

            {/* Completed Reservations */}
            {completedReservations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  Fullført ({completedReservations.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedReservations.slice(0, 6).map(renderReservationCard)}
                </div>
              </div>
            )}

            {/* Cancelled Reservations */}
            {cancelledReservations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaBan className="text-gray-600" />
                  Avbrutt ({cancelledReservations.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cancelledReservations.slice(0, 6).map(renderReservationCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
