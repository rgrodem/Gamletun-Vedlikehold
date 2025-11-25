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
  const stats = [
    {
      id: 'all',
      label: 'Totalt',
      value: totalEquipment,
      icon: FaTractor,
      bgColor: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-700',
      inactiveBg: 'bg-white',
      inactiveText: 'text-blue-700',
      inactiveBorder: 'border-blue-200',
    },
    {
      id: 'in_use',
      label: 'I bruk',
      value: inUseCount,
      icon: FaUserClock,
      bgColor: 'bg-indigo-600',
      hoverBg: 'hover:bg-indigo-700',
      inactiveBg: 'bg-white',
      inactiveText: 'text-indigo-700',
      inactiveBorder: 'border-indigo-200',
    },
    {
      id: 'maintenance',
      label: 'Vedlikehold',
      value: maintenanceCount,
      icon: FaWrench,
      bgColor: 'bg-amber-500',
      hoverBg: 'hover:bg-amber-600',
      inactiveBg: 'bg-white',
      inactiveText: 'text-amber-700',
      inactiveBorder: 'border-amber-200',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
      {/* Mobile: Stacked layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Equipment filter buttons */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <button
              key={stat.id}
              onClick={() => onFilterChange(stat.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                ${activeFilter === stat.id
                  ? `${stat.bgColor} border-transparent text-white shadow-md`
                  : `${stat.inactiveBg} ${stat.inactiveBorder} ${stat.inactiveText} hover:shadow-sm`
                }
              `}
            >
              <stat.icon className="text-lg mb-1" />
              <span className="text-xl font-bold">{stat.value}</span>
              <span className="text-[10px] font-medium opacity-80">{stat.label}</span>
            </button>
          ))}
        </div>

        {/* Quick links row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Work Orders */}
          <Link
            href="/work-orders"
            className={`
              flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
              ${openWorkOrders > 0
                ? 'bg-red-600 border-transparent text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:shadow-sm'
              }
            `}
          >
            <FaTools className="text-lg mb-1" />
            <span className="text-xl font-bold">{openWorkOrders}</span>
            <span className="text-[10px] font-medium opacity-80">Ordre</span>
            {openWorkOrders > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
          </Link>

          {/* Reservations */}
          <Link
            href="/reservations"
            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-white border-gray-200 text-gray-700 hover:shadow-sm transition-all"
          >
            <FaCalendarCheck className="text-lg mb-1" />
            <span className="text-[10px] font-medium mt-1">Reservasjoner</span>
          </Link>

          {/* 30-day stats */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-purple-600 border-transparent text-white">
            <FaCalendarCheck className="text-lg mb-1" />
            <span className="text-xl font-bold">{maintenanceLast30Days}</span>
            <span className="text-[10px] font-medium opacity-80">Siste 30d</span>
          </div>
        </div>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {/* Equipment Stats - Clickable filters */}
        <div className="flex flex-wrap gap-2 flex-1">
          {stats.map((stat) => (
            <button
              key={stat.id}
              onClick={() => onFilterChange(stat.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium
                ${activeFilter === stat.id
                  ? `${stat.bgColor} border-transparent text-white shadow-md ${stat.hoverBg}`
                  : `${stat.inactiveBg} ${stat.inactiveBorder} ${stat.inactiveText} hover:shadow-sm`
                }
              `}
            >
              <stat.icon className="text-base" />
              <span className="text-base font-bold">{stat.value}</span>
              <span className="text-sm">{stat.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-gray-200" />

        {/* Work Orders Link */}
        <Link
          href="/work-orders"
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium
            ${openWorkOrders > 0
              ? 'bg-red-600 border-transparent text-white shadow-md hover:bg-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:shadow-sm'
            }
          `}
        >
          <FaTools className="text-base" />
          <span className="text-base font-bold">{openWorkOrders}</span>
          <span className="text-sm">Åpne ordre</span>
          {openWorkOrders > 0 && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          )}
        </Link>

        {/* Reservations Link */}
        <Link
          href="/reservations"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 bg-white border-gray-200 text-gray-700 hover:shadow-sm transition-all font-medium"
        >
          <FaCalendarCheck className="text-base" />
          <span className="text-sm">Reservasjoner</span>
        </Link>

        {/* 30-day maintenance */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white border-2 border-transparent">
          <FaCalendarCheck className="text-base" />
          <span className="text-base font-bold">{maintenanceLast30Days}</span>
          <span className="text-sm">siste 30d</span>
        </div>
      </div>
    </div>
  );
}
