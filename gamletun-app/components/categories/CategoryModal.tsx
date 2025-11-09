'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaTimes, FaSave, FaPlus } from 'react-icons/fa';

interface CategoryModalProps {
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Common emoji icons for categories
const commonIcons = ['🚜', '🚚', '🏗️', '⬆️', '🚗', '⚙️', '🔧', '🛠️', '📦', '🏭', '🔨', '⚡'];

// Common colors for categories
const commonColors = [
  { name: 'Oransje', value: '#f59e0b' },
  { name: 'Blå', value: '#3b82f6' },
  { name: 'Grønn', value: '#10b981' },
  { name: 'Lilla', value: '#8b5cf6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Grå', value: '#6b7280' },
  { name: 'Rød', value: '#ef4444' },
  { name: 'Gul', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Turkis', value: '#14b8a6' },
];

export default function CategoryModal({ category, onClose, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '🚜');
  const [color, setColor] = useState(category?.color || '#3b82f6');
  const [customIcon, setCustomIcon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Kategorinavn er påkrevd');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const finalIcon = customIcon.trim() || icon;

    try {
      if (isEditing) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            icon: finalIcon,
            color: color,
          })
          .eq('id', category.id);

        if (updateError) throw updateError;
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from('categories')
          .insert({
            name: name.trim(),
            icon: finalIcon,
            color: color,
          });

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('En kategori med dette navnet eksisterer allerede');
      } else {
        setError('Kunne ikke lagre kategori. Prøv igjen.');
      }
      console.error('Error saving category:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Rediger kategori' : 'Ny kategori'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Kategorinavn *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="F.eks. Gravemaskiner"
              required
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ikon *
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {commonIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setIcon(emoji);
                    setCustomIcon('');
                  }}
                  className={`p-3 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                    icon === emoji && !customIcon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="customIcon" className="block text-xs text-gray-600 mb-1">
                Eller skriv inn eget emoji/symbol:
              </label>
              <input
                id="customIcon"
                type="text"
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl"
                placeholder="🌟"
                maxLength={2}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-sm text-gray-600">Forhåndsvisning: </span>
              <span className="text-4xl ml-2">{customIcon || icon}</span>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farge *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {commonColors.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    color === colorOption.value
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
            <div className="mt-3">
              <label htmlFor="customColor" className="block text-xs text-gray-600 mb-1">
                Eller velg egendefinert farge:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="customColor"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forhåndsvisning
            </label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-xl text-3xl shadow-md"
                  style={{
                    background: `linear-gradient(to bottom right, ${color}, ${color}dd)`,
                  }}
                >
                  {customIcon || icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{name || 'Kategorinavn'}</h3>
                  <p className="text-sm text-gray-600">Eksempel kategori</p>
                </div>
              </div>
            </div>
          </div>

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
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Lagrer...'
              ) : (
                <>
                  {isEditing ? <FaSave /> : <FaPlus />}
                  {isEditing ? 'Lagre endringer' : 'Opprett kategori'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
