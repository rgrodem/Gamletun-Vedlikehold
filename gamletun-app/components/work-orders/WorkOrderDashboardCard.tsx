'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaExclamationTriangle, FaCalendarAlt, FaTools, FaClock } from 'react-icons/fa';
import { getWorkOrdersDashboard } from '@/lib/work-orders';

export default function WorkOrderDashboardCard() {
  const [stats, setStats] = useState({
    overdue: 0,
    thisWeek: 0,
    openFaults: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getWorkOrdersDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error loading work order stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalPending = stats.overdue + stats.thisWeek + stats.openFaults;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Arbeidsordre som krever handling
          </h2>
          {totalPending > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {totalPending} ordre krever oppmerksomhet
            </p>
          )}
        </div>
        <Link
          href="/work-orders"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm touch-manipulation min-h-[40px] flex items-center"
        >
          Se alle
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Forfalt */}
        <Link
          href="/work-orders?filter=overdue"
          className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
            stats.overdue > 0
              ? 'bg-red-50 border-red-200 hover:border-red-300'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <FaExclamationTriangle className={`text-2xl ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            {stats.overdue > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                !
              </span>
            )}
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${stats.overdue > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            {stats.overdue}
          </p>
          <p className={`text-xs sm:text-sm font-medium ${stats.overdue > 0 ? 'text-red-700' : 'text-gray-500'}`}>
            Forfalt
          </p>
        </Link>

        {/* Denne uken */}
        <Link
          href="/work-orders?filter=thisweek"
          className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
            stats.thisWeek > 0
              ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <FaClock className={`text-2xl ${stats.thisWeek > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${stats.thisWeek > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
            {stats.thisWeek}
          </p>
          <p className={`text-xs sm:text-sm font-medium ${stats.thisWeek > 0 ? 'text-orange-700' : 'text-gray-500'}`}>
            Denne uken
          </p>
        </Link>

        {/* Åpne feil */}
        <Link
          href="/work-orders?filter=faults"
          className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
            stats.openFaults > 0
              ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <FaTools className={`text-2xl ${stats.openFaults > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${stats.openFaults > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
            {stats.openFaults}
          </p>
          <p className={`text-xs sm:text-sm font-medium ${stats.openFaults > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>
            Åpne feil
          </p>
        </Link>

        {/* Planlagt */}
        <Link
          href="/work-orders?filter=scheduled"
          className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
            stats.scheduled > 0
              ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <FaCalendarAlt className={`text-2xl ${stats.scheduled > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${stats.scheduled > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
            {stats.scheduled}
          </p>
          <p className={`text-xs sm:text-sm font-medium ${stats.scheduled > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
            Planlagt
          </p>
        </Link>
      </div>
    </div>
  );
}
