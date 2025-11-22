'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaTimes, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

interface DeleteCategoryModalProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteCategoryModal({ category, onClose, onSuccess }: DeleteCategoryModalProps) {
  const [equipmentCount, setEquipmentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    async function checkEquipment() {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('equipment')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', category.id);

      if (error) {
        console.error('Error counting equipment:', error);
        setError('Kunne ikke sjekke utstyr i kategorien');
      } else {
        setEquipmentCount(count || 0);
      }
      setLoadingCount(false);
    }

    checkEquipment();
  }, [category.id]);

  const handleDelete = async () => {
    if (equipmentCount && equipmentCount > 0) {
      setError('Kan ikke slette kategori med utstyr. Flytt eller slett utstyret først.');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError('Kunne ikke slette kategori. Prøv igjen.');
      console.error('Error deleting category:', err);
    } finally {
      setLoading(false);
    }
  };

  const canDelete = equipmentCount === 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-full">
              <FaExclamationTriangle className="text-red-600 text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Slett kategori
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Category Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-xl text-3xl"
                style={{
                  background: `linear-gradient(to bottom right, ${category.color}, ${category.color}dd)`,
                }}
              >
                {category.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{category.name}</h3>
                {loadingCount ? (
                  <p className="text-sm text-gray-600">Laster...</p>
                ) : (
                  <p className="text-sm text-gray-600">
                    {equipmentCount} {equipmentCount === 1 ? 'utstyr' : 'utstyr'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warning/Info Message */}
          {loadingCount ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Sjekker kategori...</p>
            </div>
          ) : canDelete ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Advarsel:</strong> Denne handlingen kan ikke angres. Kategorien vil bli permanent slettet.
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Kan ikke slettes:</strong> Denne kategorien inneholder {equipmentCount} {equipmentCount === 1 ? 'utstyr' : 'utstyr'}.
              </p>
              <p className="text-sm text-red-700">
                Du må først flytte eller slette utstyret før du kan slette kategorien.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || !canDelete || loadingCount}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Sletter...'
              ) : (
                <>
                  <FaTrash />
                  Slett kategori
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
