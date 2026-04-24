'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaTractor, FaWrench, FaCalendarAlt, FaChartBar, FaPlus } from 'react-icons/fa';

const HIDDEN_PATHS = ['/login', '/forgot-password', '/reset-password', '/auth'];

const items: Array<
  | { id: 'home'; href: string; Icon: typeof FaTractor; label: string }
  | { id: 'wo'; href: string; Icon: typeof FaWrench; label: string }
  | { id: 'spacer'; href: null; Icon: null; label: '' }
  | { id: 'res'; href: string; Icon: typeof FaCalendarAlt; label: string }
  | { id: 'rep'; href: string; Icon: typeof FaChartBar; label: string }
> = [
  { id: 'home', href: '/',             Icon: FaTractor,     label: 'Utstyr' },
  { id: 'wo',   href: '/work-orders',  Icon: FaWrench,      label: 'Ordrer' },
  { id: 'spacer', href: null,          Icon: null,          label: '' },
  { id: 'res',  href: '/reservations', Icon: FaCalendarAlt, label: 'Reserv.' },
  { id: 'rep',  href: '/reports',      Icon: FaChartBar,    label: 'Rapport' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const isActive = (id: string, href: string | null) => {
    if (!href) return false;
    if (id === 'home') return pathname === '/' || pathname.startsWith('/equipment');
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-line sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobilnavigasjon"
    >
      <div className="relative">
        <div className="grid grid-cols-5 h-16">
          {items.map((it, i) => {
            if (it.id === 'spacer' || !it.Icon || !it.href) {
              return <div key={`spacer-${i}`} />;
            }
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

        {/* Center FAB */}
        <button
          type="button"
          onClick={() => router.push('/work-orders?new=1')}
          aria-label="Ny handling"
          className="absolute left-1/2 -top-[22px] -translate-x-1/2 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center"
          style={{
            border: '4px solid var(--bg)',
            boxShadow: '0 8px 20px rgba(28,27,24,0.25)',
          }}
        >
          <FaPlus className="text-[18px]" />
        </button>
      </div>
    </nav>
  );
}
