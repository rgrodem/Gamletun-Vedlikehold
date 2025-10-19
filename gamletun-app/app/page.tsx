import { FaTractor } from 'react-icons/fa';
import { HiDocumentReport } from 'react-icons/hi';
import { createClient } from '@/lib/supabase/server';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                <FaTractor className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Gamletun Vedlikehold
                </h1>
                <p className="text-xs text-gray-500">Utstyr & Maskinpark</p>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
              <HiDocumentReport className="text-xl" />
              <span className="hidden sm:inline">Generer Rapport</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EquipmentDashboard
          categories={categories || []}
          equipment={equipment || []}
          recentMaintenance={recentMaintenance || []}
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
