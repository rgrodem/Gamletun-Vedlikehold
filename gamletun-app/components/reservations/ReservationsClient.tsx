'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaArrowLeft, FaFilter } from 'react-icons/fa';
import { MdSort } from 'react-icons/md';

interface Reservation {
    id: string;
    equipment_id: string;
    start_time: string;
    end_time: string;
    user_id: string;
    notes: string | null;
    equipment: {
        id: string;
        name: string;
        image_url: string | null;
    };
}

interface Props {
    initialReservations: Reservation[];
}

export default function ReservationsClient({ initialReservations }: Props) {
    const [sortBy, setSortBy] = useState<'date' | 'equipment'>('date');
    const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const now = new Date();

    const filteredAndSortedReservations = useMemo(() => {
        let filtered = initialReservations;

        // Filter by time
        if (filterType === 'upcoming') {
            filtered = filtered.filter(r => new Date(r.start_time) >= now);
        } else if (filterType === 'past') {
            filtered = filtered.filter(r => new Date(r.end_time) < now);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.equipment.name.toLowerCase().includes(searchTerm.toLowerCase())
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

    const getStatusBadge = (startTime: string, endTime: string) => {
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (now < start) {
            return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Kommende</span>;
        } else if (now >= start && now <= end) {
            return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Aktiv</span>;
        } else {
            return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Fullført</span>;
        }
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

                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                            <FaCalendarAlt className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservasjoner</h1>
                            <p className="text-gray-600">Oversikt over alle reservasjoner</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Søk etter utstyr..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />

                        {/* Filter */}
                        <div className="flex gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
                            >
                                <option value="all">Alle</option>
                                <option value="upcoming">Kommende</option>
                                <option value="past">Tidligere</option>
                            </select>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
                            >
                                <option value="date">Sorter etter dato</option>
                                <option value="equipment">Sorter etter utstyr</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Reservations List */}
                {filteredAndSortedReservations.length > 0 ? (
                    <div className="space-y-4">
                        {filteredAndSortedReservations.map((reservation) => (
                            <Link
                                key={reservation.id}
                                href={`/equipment/${reservation.equipment_id}`}
                                className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{reservation.equipment.name}</h3>
                                            {getStatusBadge(reservation.start_time, reservation.end_time)}
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <FaClock className="text-indigo-500" />
                                                <span>Fra: {formatDate(reservation.start_time)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaClock className="text-indigo-500" />
                                                <span>Til: {formatDate(reservation.end_time)}</span>
                                            </div>
                                        </div>

                                        {reservation.notes && (
                                            <p className="mt-2 text-sm text-gray-500 italic">"{reservation.notes}"</p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                            <FaCalendarAlt className="text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen reservasjoner funnet</h3>
                        <p className="text-gray-500">
                            {searchTerm || filterType !== 'all'
                                ? 'Prøv å justere søket eller filteret.'
                                : 'Det finnes ingen reservasjoner i systemet ennå.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
