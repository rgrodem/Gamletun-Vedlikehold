'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaTractor, FaWrench, FaCalendarAlt, FaChartBar } from 'react-icons/fa';

const HIDDEN_PATHS = ['/login', '/forgot-password', '/reset-password', '/auth'];

const items: Array<{ id: string; href: string; Icon: typeof FaTractor; label: string }> = [
  { id: 'home', href: '/',             Icon: FaTractor,     label: 'Utstyr' },
  { id: 'wo',   href: '/work-orders',  Icon: FaWrench,      label: 'Ordrer' },
  { id: 'res',  href: '/reservations', Icon: FaCalendarAlt, label: 'Reserv.' },
  { id: 'rep',  href: '/reports',      Icon: FaChartBar,    label: 'Rapport' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const isActive = (id: string, href: string) => {
    if (id === 'home') return pathname === '/' || pathname.startsWith('/equipment');
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobilnavigasjon"
    >
      <div className="grid grid-cols-4 h-16">
          {items.map((it) => {
            const on = isActive(it.id, it.href);
            const Icon = it.Icon;
            return (
              <Link
                key={it.id}
                href={it.href}
                className={`flex flex-col items-center justify-center gap-1 ${
                  on ? 'text-ink' : 'text-ink3'
                }`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon className={`text-[18px] ${on ? 'scale-[1.05]' : ''}`} aria-hidden="true" />
                <span className={`text-[10.5px] tracking-tightish ${on ? 'font-semibold' : 'font-medium'}`}>
                  {it.label}
                </span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
