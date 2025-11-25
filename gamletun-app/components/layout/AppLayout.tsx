'use client';

import { ReactNode } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar workOrderStats={workOrderStats} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Top Header */}
          <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14 sm:h-16">
                <div className="lg:hidden">
                  {/* Placeholder for mobile - sidebar button is fixed */}
                </div>
                <div className="hidden lg:block">
                  {/* Breadcrumb or page title could go here */}
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  {email && <UserMenu email={email} />}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200 py-4 mt-auto">
            <div className="px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-xs text-gray-500">
                © 2025 Gamletun. Alle rettigheter reservert. • www.gamletun.no
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
