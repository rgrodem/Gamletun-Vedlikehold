import { FaTractor, FaArrowLeft } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import UserMenu from '@/components/auth/UserMenu';

export const revalidate = 60;

export default async function EquipmentOverviewPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all equipment with categories
  const { data: equipment } = await supabase
    .from('equipment')
    .select(`
      *,
      category:categories(*)
    `)
    .order('category_id, name');

  // Group equipment by category
  const equipmentByCategory: Record<string, any[]> = {};
  const uncategorized: any[] = [];

  equipment?.forEach((item) => {
    if (item.category) {
      const categoryName = item.category.name;
      if (!equipmentByCategory[categoryName]) {
        equipmentByCategory[categoryName] = [];
      }
      equipmentByCategory[categoryName].push(item);
    } else {
      uncategorized.push(item);
    }
  });

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
                <p className="text-xs text-gray-500 hidden sm:block">Utstyrsoversikt</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Utstyrsoversikt</h1>
          <p className="text-gray-600">
            {equipment?.length || 0} {equipment?.length === 1 ? 'utstyr' : 'utstyr'} registrert
          </p>
        </div>

        {/* Equipment by Category */}
        <div className="space-y-8">
          {Object.entries(equipmentByCategory).map(([categoryName, items]) => {
            const categoryColor = items[0]?.category?.color || '#6b7280';
            const categoryIcon = items[0]?.category?.icon || '⚙️';

            return (
              <div key={categoryName} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-3 rounded-xl text-2xl"
                    style={{
                      background: `linear-gradient(to bottom right, ${categoryColor}, ${categoryColor}dd)`,
                    }}
                  >
                    {categoryIcon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{categoryName}</h2>
                    <p className="text-sm text-gray-600">{items.length} {items.length === 1 ? 'utstyr' : 'utstyr'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/equipment/${item.id}`}
                      className="group bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        {item.image_url ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{
                              background: `linear-gradient(to bottom right, ${categoryColor}, ${categoryColor}dd)`,
                            }}
                          >
                            {categoryIcon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{item.model || 'Ingen modell'}</p>
                          <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                            item.status === 'active' ? 'bg-green-100 text-green-700' :
                            item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.status === 'active' ? 'Aktiv' :
                             item.status === 'maintenance' ? 'Vedlikehold' :
                             'Inaktiv'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Uncategorized Equipment */}
          {uncategorized.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gray-200 text-2xl">
                  ⚙️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ukategorisert</h2>
                  <p className="text-sm text-gray-600">{uncategorized.length} {uncategorized.length === 1 ? 'utstyr' : 'utstyr'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uncategorized.map((item) => (
                  <Link
                    key={item.id}
                    href={`/equipment/${item.id}`}
                    className="group bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {item.image_url ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-300 flex items-center justify-center text-lg flex-shrink-0">
                          ⚙️
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{item.model || 'Ingen modell'}</p>
                        <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' :
                          item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status === 'active' ? 'Aktiv' :
                           item.status === 'maintenance' ? 'Vedlikehold' :
                           'Inaktiv'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!equipment || equipment.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen utstyr registrert</h3>
              <p className="text-gray-600 mb-6">Legg til ditt første utstyr for å komme i gang</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Gå til dashboard
              </Link>
            </div>
          )}
        </div>
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
