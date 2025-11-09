'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CategoryModal from './CategoryModal';
import DeleteCategoryModal from './DeleteCategoryModal';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  equipment?: { count: number }[];
}

interface CategoriesClientProps {
  categories: Category[];
}

export default function CategoriesClient({ categories }: CategoriesClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kategorier</h1>
          <p className="text-gray-600">
            {categories?.length || 0} {categories?.length === 1 ? 'kategori' : 'kategorier'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl hover:shadow-lg active:scale-95 transition-all font-semibold touch-manipulation"
        >
          <FaPlus />
          <span className="hidden sm:inline">Ny kategori</span>
          <span className="sm:hidden">Ny</span>
        </button>
      </div>

      {/* Categories Grid */}
      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const equipmentCount = category.equipment?.[0]?.count || 0;

            return (
              <div
                key={category.id}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
              >
                <Link
                  href={`/overview/categories/${category.id}`}
                  className="block mb-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-4 rounded-2xl text-4xl shadow-lg group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(to bottom right, ${category.color}, ${category.color}dd)`,
                      }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {equipmentCount} {equipmentCount === 1 ? 'utstyr' : 'utstyr'}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(category);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm touch-manipulation"
                  >
                    <FaEdit />
                    <span>Rediger</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingCategory(category);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm touch-manipulation"
                  >
                    <FaTrash />
                    <span>Slett</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen kategorier</h3>
          <p className="text-gray-600 mb-6">Opprett kategorier for å organisere utstyret ditt</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <FaPlus />
            Opprett første kategori
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CategoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
