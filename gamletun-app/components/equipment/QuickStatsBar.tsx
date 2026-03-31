'use client';

import Link from 'next/link';
import { FaTractor, FaTools, FaUserClock, FaWrench, FaCalendarCheck } from 'react-icons/fa';

interface QuickStatsBarProps {
  totalEquipment: number;
  inUseCount: number;
  maintenanceCount: number;
  openWorkOrders: number;
  maintenanceLast30Days: number;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export default function QuickStatsBar({
  totalEquipment,
  inUseCount,
  maintenanceCount,
  openWorkOrders,
  maintenanceLast30Days,
  onFilterChange,
  activeFilter,
}: QuickStatsBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2.5">
      {/* Scrollable row on mobile, wrapping on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap sm:overflow-visible scrollbar-hide items-center">

        {/* Equipment filter buttons */}
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            activeFilter === 'all'
              ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-400'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FaTractor className="text-xs" />
          <span className="text-sm font-semibold">{totalEquipment}</span>
          <span className="text-xs">Totalt</span>
        </button>

        <button
          onClick={() => onFilterChange('in_use')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            activeFilter === 'in_use'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-400'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FaUserClock className="text-xs" />
          <span className="text-sm font-semibold">{inUseCount}</span>
          <span className="text-xs">I bruk</span>
        </button>

        <button
          onClick={() => onFilterChange('maintenance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            activeFilter === 'maintenance'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700 ring-1 ring-yellow-400'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FaWrench className="text-xs" />
          <span className="text-sm font-semibold">{maintenanceCount}</span>
          <span className="text-xs">Vedl.</span>
        </button>

        <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

        {/* Work orders link */}
        <Link
          href="/work-orders"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            openWorkOrders > 0
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FaTools className="text-xs" />
          <span className="text-sm font-semibold">{openWorkOrders}</span>
          <span className="text-xs">Ordrer</span>
          {openWorkOrders > 0 && (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
        </Link>

        {/* 30-day maintenance */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 flex-shrink-0">
          <FaCalendarCheck className="text-xs text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">{maintenanceLast30Days}</span>
          <span className="text-xs text-purple-600">siste 30d</span>
        </div>
      </div>
    </div>
  );
}
