'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  FaTractor,
  FaTools,
  FaCalendarAlt,
  FaClipboardList,
  FaBars,
  FaTimes,
  FaChartBar,
  FaHome,
} from 'react-icons/fa';
import { HiDocumentReport } from 'react-icons/hi';

interface SidebarProps {
  workOrderStats?: {
    overdue: number;
    openFaults: number;
  };
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: FaHome },
  { name: 'Utstyr', href: '/equipment', icon: FaTractor },
  { name: 'Arbeidsordrer', href: '/work-orders', icon: FaTools },
  { name: 'Reservasjoner', href: '/reservations', icon: FaCalendarAlt },
  { name: 'Rapporter', href: '/reports', icon: HiDocumentReport },
];

export default function Sidebar({ workOrderStats }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const urgentCount = (workOrderStats?.overdue || 0) + (workOrderStats?.openFaults || 0);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
        aria-label="Åpne meny"
      >
        <FaBars className="text-xl" />
      </button>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Lukk meny"
        >
          <FaTimes className="text-xl" />
        </button>

        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-28">
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
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const showBadge = item.href === '/work-orders' && urgentCount > 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
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

        {/* Quick Stats at bottom */}
        {workOrderStats && (workOrderStats.overdue > 0 || workOrderStats.openFaults > 0) && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-800 mb-2">Krever oppmerksomhet</p>
              <div className="space-y-1">
                {workOrderStats.overdue > 0 && (
                  <Link
                    href="/work-orders?filter=overdue"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-sm text-red-700 hover:text-red-900"
                  >
                    <span>Forfalt</span>
                    <span className="font-bold">{workOrderStats.overdue}</span>
                  </Link>
                )}
                {workOrderStats.openFaults > 0 && (
                  <Link
                    href="/work-orders?filter=faults"
                    onClick={() => setMobileMenuOpen(false)}
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
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Gamletun Vedlikehold
          </p>
        </div>
      </aside>
    </>
  );
}
