'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FaTractor,
  FaWrench,
  FaCalendarAlt,
  FaChartBar,
  FaPlus,
  FaExclamationTriangle,
  FaHandPaper,
} from 'react-icons/fa';

const HIDDEN_PATHS = ['/login', '/auth'];

const items: Array<{ id: string; href: string; Icon: typeof FaTractor; label: string }> = [
  { id: 'home', href: '/',             Icon: FaTractor,     label: 'Utstyr' },
  { id: 'wo',   href: '/work-orders',  Icon: FaWrench,      label: 'Ordrer' },
  { id: 'res',  href: '/reservations', Icon: FaCalendarAlt, label: 'Reserv.' },
  { id: 'rep',  href: '/reports',      Icon: FaChartBar,    label: 'Rapport' },
];

const quickActions: Array<{ href: string; Icon: typeof FaTractor; label: string }> = [
  { href: '/?add=equipment',  Icon: FaTractor,             label: 'Nytt utstyr' },
  { href: '/?action=reserve', Icon: FaHandPaper,           label: 'Ny reservasjon' },
  { href: '/?action=fault',   Icon: FaExclamationTriangle, label: 'Meld feil' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lukk hurtigmenyen ved navigasjon.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    <>
      {/* Trykk utenfor boksene lukker menyen */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobilnavigasjon"
      >
        {menuOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[calc(100vw-32px)] max-w-sm grid grid-cols-3 gap-2.5 px-1">
            {quickActions.map(({ href, Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center justify-center gap-2 aspect-square bg-paper border border-line rounded-[18px] shadow-lg text-ink active:scale-95 transition-transform"
              >
                <Icon className="text-[22px]" aria-hidden="true" />
                <span className="text-[12px] font-semibold text-center leading-tight px-1">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 h-16">
          {items.slice(0, 2).map(renderItem)}
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            className="relative -mt-5 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper border-[3px] border-bg shadow-lg transition-transform active:scale-95"
            aria-label={menuOpen ? 'Lukk hurtigmeny' : 'Åpne hurtigmeny'}
            aria-expanded={menuOpen}
          >
            <FaPlus
              className={`text-[20px] transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`}
              aria-hidden="true"
            />
          </button>
          {items.slice(2).map(renderItem)}
        </div>
      </nav>
    </>
  );
}
