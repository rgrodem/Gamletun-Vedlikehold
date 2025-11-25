'use client';

import Link from 'next/link';
import { FaTractor, FaTools, FaUserClock, FaWrench, FaCalendarCheck, FaExclamationCircle } from 'react-icons/fa';

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
  const stats = [
    {
      id: 'all',
      label: 'Totalt',
      value: totalEquipment,
      icon: FaTractor,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      activeRing: 'ring-blue-500',
    },
    {
      id: 'in_use',
      label: 'I bruk',
      value: inUseCount,
      icon: FaUserClock,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      activeRing: 'ring-indigo-500',
    },
    {
      id: 'maintenance',
      label: 'Vedlikehold',
      value: maintenanceCount,
      icon: FaWrench,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      activeRing: 'ring-yellow-500',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Equipment Stats - Clickable filters */}
        <div className="flex flex-wrap gap-2 flex-1">
          {stats.map((stat) => (
            <button
              key={stat.id}
              onClick={() => onFilterChange(stat.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                ${activeFilter === stat.id
                  ? `${stat.bgColor} ${stat.borderColor} ring-2 ${stat.activeRing} ring-offset-1`
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <stat.icon className={`text-sm ${activeFilter === stat.id ? stat.textColor : 'text-gray-500'}`} />
              <span className={`text-sm font-medium ${activeFilter === stat.id ? stat.textColor : 'text-gray-700'}`}>
                {stat.value}
              </span>
              <span className={`text-xs ${activeFilter === stat.id ? stat.textColor : 'text-gray-500'} hidden sm:inline`}>
                {stat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-gray-200" />

        {/* Work Orders Link */}
        <Link
          href="/work-orders"
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
            ${openWorkOrders > 0
              ? 'bg-red-50 border-red-200 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }
          `}
        >
          <FaTools className={`text-sm ${openWorkOrders > 0 ? 'text-red-600' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${openWorkOrders > 0 ? 'text-red-700' : 'text-gray-700'}`}>
            {openWorkOrders}
          </span>
          <span className={`text-xs hidden sm:inline ${openWorkOrders > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            Åpne ordre
          </span>
          {openWorkOrders > 0 && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Link>

        {/* Reservations Link */}
        <Link
          href="/reservations"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-50 border-gray-200 hover:bg-gray-100 transition-all"
        >
          <FaCalendarCheck className="text-sm text-gray-500" />
          <span className="text-xs text-gray-500 hidden sm:inline">Reservasjoner</span>
        </Link>

        {/* 30-day maintenance */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
          <FaCalendarCheck className="text-sm text-purple-600" />
          <span className="text-sm font-medium text-purple-700">{maintenanceLast30Days}</span>
          <span className="text-xs text-purple-600 hidden sm:inline">siste 30d</span>
        </div>
      </div>
    </div>
  );
}
