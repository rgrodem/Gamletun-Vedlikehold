import { FaTractor, FaArrowLeft, FaTools } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import UserMenu from '@/components/auth/UserMenu';

export const revalidate = 60;

export default async function MaintenanceOverviewPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch maintenance logs from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      equipment:equipment_id (id, name),
      maintenance_type:maintenance_type_id (type_name),
      performed_by_profile:performed_by (full_name)
    `)
    .gte('performed_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('performed_date', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 sm:p-2.5 rounded-xl shadow-lg">
                <FaTractor className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Gamletun Vedlikehold
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Vedlikeholdshistorikk</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {user && <UserMenu email={user.email || ''} />}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <FaArrowLeft />
            <span>Tilbake til oversikt</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vedlikeholdshistorikk</h1>
          <p className="text-gray-600">
            {maintenanceLogs?.length || 0} {maintenanceLogs?.length === 1 ? 'registrering' : 'registreringer'} siste 30 dager
          </p>
        </div>

        {/* Maintenance Timeline */}
        {maintenanceLogs && maintenanceLogs.length > 0 ? (
          <div className="space-y-4">
            {maintenanceLogs.map((log: any) => {
              const performedDate = new Date(log.performed_date);
              const daysAgo = Math.floor(
                (Date.now() - performedDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Link
                  key={log.id}
                  href={`/equipment/${log.equipment?.id}`}
                  className="group block bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-[1.01]"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 p-3 rounded-xl flex-shrink-0">
                      <FaTools className="text-2xl text-purple-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                            {log.equipment?.name || 'Ukjent utstyr'}
                          </h3>
                          {log.maintenance_type && (
                            <p className="text-sm text-purple-600 font-medium">
                              {log.maintenance_type.type_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900">
                            {performedDate.toLocaleDateString('nb-NO', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {daysAgo === 0
                              ? 'I dag'
                              : daysAgo === 1
                              ? 'I går'
                              : `${daysAgo} dager siden`}
                          </p>
                        </div>
                      </div>

                      {log.description && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {log.description}
                        </p>
                      )}

                      {log.performed_by_profile && (
                        <p className="text-xs text-gray-500">
                          Utført av: {log.performed_by_profile.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ingen vedlikehold registrert
            </h3>
            <p className="text-gray-600 mb-6">
              Ingen vedlikeholdsaktiviteter de siste 30 dagene
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              Gå til dashboard
            </Link>
          </div>
        )}
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
