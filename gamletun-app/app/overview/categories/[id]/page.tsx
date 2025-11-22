import { FaTractor, FaArrowLeft } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import UserMenu from '@/components/auth/UserMenu';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch category
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (!category) {
    notFound();
  }

  // Fetch equipment in this category
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('category_id', id)
    .order('name');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <Image src="/logo.png" alt="Gamletun Gaard" width={48} height={48} className="object-contain" priority />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Gamletun Vedlikehold
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{category.name}</p>
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
            href="/overview/categories"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <FaArrowLeft />
            <span>Tilbake til kategorier</span>
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-4 rounded-2xl text-5xl shadow-lg"
              style={{
                background: `linear-gradient(to bottom right, ${category.color}, ${category.color}dd)`,
              }}
            >
              {category.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{category.name}</h1>
              <p className="text-gray-600">
                {equipment?.length || 0} {equipment?.length === 1 ? 'utstyr' : 'utstyr'}
              </p>
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        {equipment && equipment.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((item) => (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-105"
              >
                <div
                  className="p-6 border-b border-gray-100"
                  style={{
                    background: `linear-gradient(to bottom right, ${category.color}15, ${category.color}05)`,
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <div className="relative w-16 h-16 rounded-2xl shadow-lg group-hover:scale-110 transition-transform overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div
                          className="p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform text-3xl flex-shrink-0"
                          style={{
                            background: `linear-gradient(to bottom right, ${category.color}, ${category.color}dd)`,
                          }}
                        >
                          {category.icon}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600">{item.model || 'Ingen modell'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'active' ? 'bg-green-100 text-green-700' :
                    item.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status === 'active' ? 'Aktiv' :
                     item.status === 'in_use' ? 'I bruk' :
                     item.status === 'maintenance' ? 'Under vedlikehold' :
                     'Inaktiv'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen utstyr i denne kategorien</h3>
            <p className="text-gray-600 mb-6">Legg til utstyr i kategorien {category.name}</p>
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
