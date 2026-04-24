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

export default function AppLayout({ children, email, workOrderStats }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="flex">
        <Sidebar workOrderStats={workOrderStats} />

        <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
          {/* Top header — slim, paper background, no shadow */}
          <header
            className="bg-paper/90 backdrop-blur-md border-b border-line sticky top-0 z-40"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="px-5 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14">
                <div className="lg:hidden">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-8 w-24">
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
                <div className="flex items-center gap-4 ml-auto">
                  {email && <UserMenu email={email} />}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 sm:px-6 lg:px-8 py-5">
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
