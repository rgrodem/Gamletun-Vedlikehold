'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaTools, FaClipboardList, FaCalendarAlt, FaChartBar } from 'react-icons/fa';

const navItems = [
  { href: '/', icon: FaTools, label: 'Utstyr' },
  { href: '/work-orders', icon: FaClipboardList, label: 'Ordrer' },
  { href: '/reservations', icon: FaCalendarAlt, label: 'Reserv.' },
  { href: '/reports', icon: FaChartBar, label: 'Rapport' },
];

const HIDDEN_PATHS = ['/login', '/forgot-password', '/reset-password'];

export default function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 sm:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      aria-label="Mobilnavigasjon"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full touch-manipulation min-h-[44px] ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="text-xl" aria-hidden="true" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
