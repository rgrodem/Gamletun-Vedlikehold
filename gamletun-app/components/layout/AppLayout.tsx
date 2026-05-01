'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from './Sidebar';
import UserMenu from '../auth/UserMenu';

interface AppLayoutProps {
  children: ReactNode;
  email?: string;
  workOrderStats?: {
    overdue: number;
    openFaults: number;
  };
}

/*
 * AppLayout is the shared chrome around every authenticated page.
 *
 * Mobile-overflow rules baked in here:
 *   - The outer wrapper is `w-full overflow-x-hidden` so a misbehaving child
 *     can never trigger horizontal scroll on the document.
 *   - The flex column has `min-w-0` so flex children with `truncate` actually
 *     truncate instead of pushing the container wider than the viewport.
 *   - <main> has `min-w-0 max-w-full` for the same reason and a desktop
 *     max-width so content stays readable on big screens.
 */
export default function AppLayout({ children, email, workOrderStats }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-bg text-ink">
      <div className="flex min-h-screen">
        <Sidebar workOrderStats={workOrderStats} />

        <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-64">
          {/* Top header — slim, paper background, no shadow */}
          <header
            className="bg-paper/90 backdrop-blur-md border-b border-line sticky top-0 z-40"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="px-5 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14 min-w-0 gap-3">
                <div className="lg:hidden min-w-0">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-8 w-24 flex-shrink-0">
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
                <div className="hidden lg:block" />
                <div className="flex items-center gap-4 ml-auto min-w-0">
                  {email && <UserMenu email={email} />}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 sm:px-6 lg:px-8 py-5 min-w-0 max-w-full mx-auto w-full lg:max-w-6xl">
            {children}
          </main>

          <footer className="hidden lg:block border-t border-line py-4 mt-auto">
            <div className="px-8 text-center">
              <p className="text-xs text-ink3">
                © 2025 Gamletun · www.gamletun.no
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
