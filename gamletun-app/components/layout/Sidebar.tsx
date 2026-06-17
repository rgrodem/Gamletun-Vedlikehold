'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  FaTractor,
  FaTools,
  FaCalendarAlt,
  FaChartBar,
  FaBoxes,
  FaUsers,
} from 'react-icons/fa';
import { HiDocumentReport } from 'react-icons/hi';
import { useRole } from '@/components/RoleProvider';

interface SidebarProps {
  workOrderStats?: {
    overdue: number;
    openFaults: number;
  };
}

const navigation = [
  { name: 'Utstyr', href: '/', icon: FaTractor },
  { name: 'Arbeidsordrer', href: '/work-orders', icon: FaTools },
  { name: 'Varelager', href: '/parts', icon: FaBoxes },
  { name: 'Reservasjoner', href: '/reservations', icon: FaCalendarAlt },
  { name: 'Rapporter', href: '/reports', icon: HiDocumentReport },
];

export default function Sidebar({ workOrderStats }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const navItems = isAdmin
    ? [...navigation, { name: 'Brukere', href: '/users', icon: FaUsers }]
    : navigation;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/equipment');
    return pathname.startsWith(href);
  };

  const urgentCount = (workOrderStats?.overdue || 0) + (workOrderStats?.openFaults || 0);

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
      {/* Logo */}
      <div className="h-20 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-36">
            <Image
              src="/logo.png"
              alt="Gamletun Gaard"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const showBadge = item.href === '/work-orders' && urgentCount > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`text-lg ${active ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="flex-1">{item.name}</span>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {urgentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Urgent items */}
      {workOrderStats && (workOrderStats.overdue > 0 || workOrderStats.openFaults > 0) && (
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-800 mb-2">Krever oppmerksomhet</p>
            <div className="space-y-1">
              {workOrderStats.overdue > 0 && (
                <Link
                  href="/work-orders?filter=overdue"
                  className="flex items-center justify-between text-sm text-red-700 hover:text-red-900"
                >
                  <span>Forfalt</span>
                  <span className="font-bold">{workOrderStats.overdue}</span>
                </Link>
              )}
              {workOrderStats.openFaults > 0 && (
                <Link
                  href="/work-orders?filter=faults"
                  className="flex items-center justify-between text-sm text-orange-700 hover:text-orange-900"
                >
                  <span>Åpne feil</span>
                  <span className="font-bold">{workOrderStats.openFaults}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">Gamletun Vedlikehold</p>
      </div>
    </aside>
  );
}
