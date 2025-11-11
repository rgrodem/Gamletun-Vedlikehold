'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaHandPaper, FaUser, FaClock } from 'react-icons/fa';
import { Reservation } from '@/lib/reservations';

interface InUseClientProps {
  reservations: Reservation[];
}

export default function InUseClient({ reservations }: InUseClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (endTime: string | null) => {
    if (!endTime) return null;

    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return 'Utgått';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} dag${days > 1 ? 'er' : ''} igjen`;
    }

    if (hours > 0) {
      return `${hours}t ${minutes}m igjen`;
    }

    return `${minutes} min igjen`;
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
              <FaHandPaper className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Utstyr i Bruk</h1>
              <p className="text-gray-600 mt-1">
                {reservations.length} {reservations.length === 1 ? 'utstyr' : 'utstyr'} er reservert
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reservations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <FaHandPaper className="text-6xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingen utstyr i bruk</h2>
            <p className="text-gray-600">Alt utstyr er tilgjengelig for bruk</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservations.map((reservation) => {
              const isStarted = new Date(reservation.start_time) <= new Date();
              const timeRemaining = reservation.end_time ? getTimeRemaining(reservation.end_time) : null;

              return (
                <Link
                  key={reservation.id}
                  href={`/equipment/${reservation.equipment_id}`}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Equipment Image/Icon */}
                    {reservation.equipment?.image_url ? (
                      <div className="relative w-16 h-16 rounded-xl shadow-md overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
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
                        className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform"
                        style={{
                          background: `linear-gradient(to bottom right, ${reservation.equipment.category.color}, ${reservation.equipment.category.color}dd)`
                        }}
                      >
                        {reservation.equipment.category.icon}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl bg-gray-200 flex-shrink-0 group-hover:scale-110 transition-transform">
                        🏗️
                      </div>
                    )}

                    {/* Status Indicator */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {reservation.equipment?.name || 'Ukjent utstyr'}
                      </h3>
                      {reservation.equipment?.model && (
                        <p className="text-sm text-gray-600 truncate">{reservation.equipment.model}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-blue-700">
                          {isStarted ? 'Pågår nå' : 'Planlagt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <FaUser className="text-blue-600" />
                      <span className="font-medium">
                        {reservation.user_profile?.full_name || 'Ukjent bruker'}
                      </span>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaClock className="text-xs" />
                      <span className="text-xs">
                        Fra: <span className="font-medium text-gray-900">{formatDate(reservation.start_time)}</span>
                      </span>
                    </div>
                    {reservation.end_time ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaClock className="text-xs" />
                          <span className="text-xs">
                            Til: <span className="font-medium text-gray-900">{formatDate(reservation.end_time)}</span>
                          </span>
                        </div>
                        {timeRemaining && (
                          <div className={`text-xs font-medium ${timeRemaining === 'Utgått' ? 'text-red-600' : 'text-blue-600'}`}>
                            {timeRemaining}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaClock className="text-xs" />
                        <span className="text-xs">Sluttid: <span className="font-medium text-gray-900">Ikke angitt</span></span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {reservation.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 italic line-clamp-2">&quot;{reservation.notes}&quot;</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
