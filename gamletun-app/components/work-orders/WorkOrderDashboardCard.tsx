'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaExclamationTriangle, FaCalendarAlt, FaTools, FaClock, FaArrowRight } from 'react-icons/fa';
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 animate-pulse">
        <div className="h-8 bg-gray-100 rounded mb-6 w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalPending = stats.overdue + stats.thisWeek + stats.openFaults;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaTools className="text-blue-600" />
            Arbeidsordre
          </h2>
          {totalPending > 0 ? (
            <p className="text-sm text-gray-500 mt-1">
              Du har <span className="font-semibold text-gray-900">{totalPending}</span> ordre som krever oppmerksomhet
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Alt ser bra ut! Ingen utestående ordre.</p>
          )}
        </div>
        <Link
          href="/work-orders"
          className="group flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Se alle ordre
          <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Forfalt */}
        <Link
          href="/work-orders?filter=overdue"
          className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${stats.overdue > 0
            ? 'bg-red-50 border-red-100 hover:border-red-200'
            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stats.overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
              <FaExclamationTriangle className="text-xl" />
            </div>
            {stats.overdue > 0 && (
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${stats.overdue > 0 ? 'text-red-700' : 'text-gray-400'}`}>
              {stats.overdue}
            </p>
            <p className={`text-xs sm:text-sm font-medium ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              Forfalt
            </p>
          </div>
        </Link>

        {/* Denne uken */}
        <Link
          href="/work-orders?filter=thisweek"
          className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${stats.thisWeek > 0
            ? 'bg-orange-50 border-orange-100 hover:border-orange-200'
            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stats.thisWeek > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
              <FaClock className="text-xl" />
            </div>
          </div>
          <div>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${stats.thisWeek > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
              {stats.thisWeek}
            </p>
            <p className={`text-xs sm:text-sm font-medium ${stats.thisWeek > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
              Denne uken
            </p>
          </div>
        </Link>

        {/* Åpne feil */}
        <Link
          href="/work-orders?filter=faults"
          className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${stats.openFaults > 0
            ? 'bg-yellow-50 border-yellow-100 hover:border-yellow-200'
            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stats.openFaults > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
              <FaTools className="text-xl" />
            </div>
          </div>
          <div>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${stats.openFaults > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
              {stats.openFaults}
            </p>
            <p className={`text-xs sm:text-sm font-medium ${stats.openFaults > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
              Åpne feil
            </p>
          </div>
        </Link>

        {/* Planlagt */}
        <Link
          href="/work-orders?filter=scheduled"
          className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${stats.scheduled > 0
            ? 'bg-blue-50 border-blue-100 hover:border-blue-200'
            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stats.scheduled > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <FaCalendarAlt className="text-xl" />
            </div>
          </div>
          <div>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${stats.scheduled > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
              {stats.scheduled}
            </p>
            <p className={`text-xs sm:text-sm font-medium ${stats.scheduled > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
              Planlagt
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

