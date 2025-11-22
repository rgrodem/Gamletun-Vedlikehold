import { FaArrowLeft } from 'react-icons/fa';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import UserMenu from '@/components/auth/UserMenu';
import CategoriesClient from '@/components/categories/CategoriesClient';

export const revalidate = 60;

export default async function CategoriesOverviewPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all categories with equipment count
  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      equipment(count)
    `)
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
                <p className="text-xs text-gray-500 hidden sm:block">Kategorioversikt</p>
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
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <FaArrowLeft />
          <span>Tilbake til oversikt</span>
        </Link>

        {/* Categories Client Component */}
        <CategoriesClient categories={categories || []} />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white/50 backdrop-blur-sm border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600">© 2025 Gamletun. Alle rettigheter reservert.</p>
          <p className="text-xs text-gray-400 mt-1">www.gamletun.no</p>
        </div>
      </footer>
    </div>
  );
}
