'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaTractor, FaWrench, FaCalendarAlt, FaChartBar, FaPlus } from 'react-icons/fa';

const HIDDEN_PATHS = ['/login', '/auth'];

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

  const renderItem = (it: (typeof items)[number]) => {
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
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobilnavigasjon"
    >
      <div className="grid grid-cols-5 h-16">
        {items.slice(0, 2).map(renderItem)}
        <Link
          href="/?add=equipment"
          className="relative -mt-5 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper border-[3px] border-bg shadow-lg transition-transform active:scale-95"
          aria-label="Legg til utstyr"
        >
          <FaPlus className="text-[20px]" aria-hidden="true" />
        </Link>
        {items.slice(2).map(renderItem)}
      </div>
    </nav>
  );
}
