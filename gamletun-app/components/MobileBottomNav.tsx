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

const HIDDEN_PATHS = ['/login', '/forgot-password', '/reset-password', '/auth'];

export default function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 sm:hidden"
      style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.07)' }}
      aria-label="Mobilnavigasjon"
    >
      <div className="flex items-stretch h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/'
            ? pathname === '/' || pathname.startsWith('/equipment')
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors touch-manipulation ${
                isActive ? 'text-blue-600' : 'text-gray-400 active:text-gray-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator bar at top */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
                  isActive ? 'w-8 bg-blue-600' : 'w-0 bg-transparent'
                }`}
              />
              <Icon className={`text-xl transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} aria-hidden="true" />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
