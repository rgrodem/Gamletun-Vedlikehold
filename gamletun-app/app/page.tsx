import { HiDocumentReport } from 'react-icons/hi';
import { createClient } from '@/lib/supabase/server';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';
import UserMenu from '@/components/auth/UserMenu';
import Link from 'next/link';
import Image from 'next/image';
import { getOpenWorkOrderCountsByEquipment } from '@/lib/work-orders';

// Revalidate every 60 seconds instead of on every request
export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch categories from database
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  // Fetch equipment with their categories
  const { data: equipment } = await supabase
    .from('equipment')
    .select(`
      *,
      category:categories(*)
    `)
    .order('name');

  // Fetch maintenance logs from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentMaintenance } = await supabase
    .from('maintenance_logs')
    .select('id')
    .gte('performed_date', thirtyDaysAgo.toISOString().split('T')[0]);

  // Fetch open work order counts
  const workOrderCounts = await getOpenWorkOrderCountsByEquipment();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative h-12 w-32 sm:h-14 sm:w-40">
                <Image
                  src="/logo.png"
                  alt="Gamletun Gaard"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="border-l border-gray-300 pl-2 sm:pl-3">
                <h1 className="text-sm sm:text-base font-semibold text-gray-900">
                  Vedlikehold
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Utstyr & Maskinpark</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/reports" className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:shadow-lg active:scale-95 transition-all duration-200 font-medium touch-manipulation">
                <HiDocumentReport className="text-lg sm:text-xl" />
                <span className="hidden sm:inline text-sm sm:text-base">Generer Rapport</span>
                <span className="sm:hidden text-xs">Rapport</span>
              </Link>
              {user && <UserMenu email={user.email || ''} />}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EquipmentDashboard
          categories={categories || []}
          equipment={equipment || []}
          recentMaintenance={recentMaintenance || []}
          workOrderCounts={workOrderCounts}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white/50 backdrop-blur-sm border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600">© 2025 Gamletun. Alle rettigheter reservert.</p>
          <p className="text-xs text-gray-500 mt-1">www.gamletun.no</p>
        </div>
      </footer>
    </div>
  );
}
