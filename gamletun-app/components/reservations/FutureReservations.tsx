'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import Link from 'next/link';

interface Reservation {
    id: string;
    equipment_id: string;
    start_time: string;
    end_time: string;
    equipment: {
        name: string;
        image_url: string | null;
    };
    user_id: string;
}

export default function FutureReservations() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            const supabase = createClient();
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('reservations')
                .select(`
          id,
          equipment_id,
          start_time,
          end_time,
          equipment:equipment_id (name, image_url)
        `)
                .gte('start_time', now)
                .order('start_time', { ascending: true })
                .limit(5);

            if (!error && data) {
                // Cast the data to match our interface since Supabase types might be loose
                setReservations(data as any[]);
            }
            setLoading(false);
        };

        fetchReservations();
    }, []);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <FaCalendarAlt className="text-xl" />
                </div>
                <h3 className="font-bold text-gray-900">Kommende reservasjoner</h3>
            </div>

            {loading ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                    Laster...
                </div>
            ) : reservations.length === 0 ? (
                <div className="text-center py-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400">
                        <FaCalendarAlt className="text-xl" />
                    </div>
                    <p className="text-sm text-gray-500">Ingen kommende reservasjoner</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reservations.map((res) => (
                        <Link
                            key={res.id}
                            href={`/equipment/${res.equipment_id}`}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {res.equipment.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <FaClock className="text-indigo-400" />
                                    <span>
                                        {new Date(res.start_time).toLocaleDateString('nb-NO', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {new Date(res.start_time).toLocaleDateString() === new Date().toLocaleDateString()
                                    ? 'I dag'
                                    : 'Fremtidig'}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
