'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaUser, FaSearch } from 'react-icons/fa';

interface Reservation {
    id: string;
    equipment_id: string;
    start_time: string;
    end_time: string | null;
    user_id: string;
    notes: string | null;
    status?: string;
    equipment: {
        id: string;
        name: string;
        image_url: string | null;
    };
    user_profile?: {
        id: string;
        full_name: string;
    } | null;
}

interface Props {
    initialReservations: Reservation[];
}

export default function ReservationsClient({ initialReservations }: Props) {
    const [sortBy, setSortBy] = useState<'date' | 'equipment'>('date');
    const [filterType, setFilterType] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const now = new Date();

    const filteredAndSortedReservations = useMemo(() => {
        let filtered = initialReservations;

        // Filter by status/time
        if (filterType === 'active') {
            filtered = filtered.filter(r => r.status === 'active');
        } else if (filterType === 'completed') {
            filtered = filtered.filter(r => r.status === 'completed' || r.status === 'cancelled');
        } else if (filterType === 'upcoming') {
            filtered = filtered.filter(r => r.status === 'active' && new Date(r.start_time) > now);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
            } else {
                return a.equipment.name.localeCompare(b.equipment.name);
            }
        });

        return sorted;
    }, [initialReservations, sortBy, filterType, searchTerm, now]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (reservation: Reservation) => {
        const status = reservation.status || 'active';
        const start = new Date(reservation.start_time);
        const end = reservation.end_time ? new Date(reservation.end_time) : null;

        if (status === 'completed') {
            return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Fullført</span>;
        }
        if (status === 'cancelled') {
            return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Avbrutt</span>;
        }
        if (now < start) {
            return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Kommende</span>;
        }
        if (now >= start && (!end || now <= end)) {
            return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-pulse">Aktiv nå</span>;
        }
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Fullført</span>;
    };

    const activeCount = initialReservations.filter(r => r.status === 'active').length;
    const completedCount = initialReservations.filter(r => r.status === 'completed' || r.status === 'cancelled').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reservasjoner</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {filteredAndSortedReservations.length} av {initialReservations.length} reservasjoner
                    </p>
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Alle ({initialReservations.length})
                </button>
                <button
                    onClick={() => setFilterType('active')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterType === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                >
                    Aktive ({activeCount})
                </button>
                <button
                    onClick={() => setFilterType('completed')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterType === 'completed' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    Fullført ({completedCount})
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Søk etter utstyr eller bruker..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer text-sm"
                    >
                        <option value="date">Nyeste først</option>
                        <option value="equipment">Etter utstyr</option>
                    </select>
                </div>
            </div>

            {/* Reservations List */}
            {filteredAndSortedReservations.length > 0 ? (
                <div className="space-y-3">
                    {filteredAndSortedReservations.map((reservation) => (
                        <Link
                            key={reservation.id}
                            href={`/equipment/${reservation.equipment_id}`}
                            className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <h3 className="text-base font-bold text-gray-900">{reservation.equipment.name}</h3>
                                        {getStatusBadge(reservation)}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <FaUser className="text-gray-400 text-xs" />
                                            <span>{reservation.user_profile?.full_name || 'Ukjent bruker'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaClock className="text-gray-400 text-xs" />
                                            <span>{formatDate(reservation.start_time)}</span>
                                        </div>
                                        {reservation.end_time && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">→</span>
                                                <span>{formatDate(reservation.end_time)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {reservation.notes && (
                                        <p className="mt-2 text-xs text-gray-500 italic line-clamp-1">"{reservation.notes}"</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <FaCalendarAlt className="text-2xl" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Ingen reservasjoner funnet</h3>
                    <p className="text-gray-500 text-sm">
                        {searchTerm || filterType !== 'all'
                            ? 'Prøv å justere søket eller filteret.'
                            : 'Det finnes ingen reservasjoner i systemet ennå.'}
                    </p>
                </div>
            )}
        </div>
    );
}
