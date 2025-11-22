'use client';

import { useState } from 'react';
import { FaTimes, FaSave, FaTrash } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import ImageUpload from '../uploads/ImageUpload';
import { deleteFile } from '@/lib/storage';

interface Category {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  status: string;
  category_id: string | null;
  notes: string | null;
  image_url: string | null;
}

interface EditEquipmentModalProps {
  equipment: Equipment;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditEquipmentModal({ equipment, categories, onClose, onSuccess }: EditEquipmentModalProps) {
  const [name, setName] = useState(equipment.name);
  const [model, setModel] = useState(equipment.model || '');
  const [serialNumber, setSerialNumber] = useState(equipment.serial_number || '');
  const [purchaseDate, setPurchaseDate] = useState(equipment.purchase_date || '');
  const [status, setStatus] = useState(equipment.status);
  const [categoryId, setCategoryId] = useState(equipment.category_id || '');
  const [notes, setNotes] = useState(equipment.notes || '');
  const [imageUrl, setImageUrl] = useState<string | null>(equipment.image_url);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleImageUploaded = (url: string, path: string) => {
    setImageUrl(url);
    setImagePath(path);
  };

  const handleImageRemoved = async () => {
    // Delete old image from storage if exists
    if (equipment.image_url && imagePath) {
      try {
        await deleteFile('equipment-images', imagePath);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }
    setImageUrl(null);
    setImagePath(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          name: name.trim(),
          model: model.trim() || null,
          serial_number: serialNumber.trim() || null,
          purchase_date: purchaseDate || null,
          status,
          category_id: categoryId || null,
          notes: notes.trim() || null,
          image_url: imageUrl,
        })
        .eq('id', equipment.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating equipment:', err);
      setError(err.message || 'Kunne ikke oppdatere utstyr');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // First, delete associated maintenance logs
      const { error: logsError } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('equipment_id', equipment.id);

      if (logsError) throw logsError;

      // Then delete maintenance types
      const { error: typesError } = await supabase
        .from('maintenance_types')
        .delete()
        .eq('equipment_id', equipment.id);

      if (typesError) throw typesError;

      // Finally, delete the equipment
      const { error: deleteError } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipment.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      setError(err.message || 'Kunne ikke slette utstyr');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-xl sm:text-2xl font-bold">Rediger Utstyr</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-lg sm:text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Navn *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="F.eks. Traktor, Gravemaskin"
            />
          </div>

          {/* Equipment Image */}
          <div>
            <ImageUpload
              currentImageUrl={imageUrl}
              onImageUploaded={handleImageUploaded}
              onImageRemoved={handleImageRemoved}
              bucket="equipment-images"
              folder={equipment.id}
              maxSizeMB={40}
              label="Bilde av utstyr"
              description="Last opp et bilde av utstyret (erstatter emoji-ikon). iPhone-bilder støttes."
              aspectRatio="landscape"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modell
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="F.eks. John Deere 6430"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serienummer
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="F.eks. ABC123456"
            />
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Velg kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Aktiv</option>
                <option value="in_use">I bruk</option>
                <option value="maintenance">Under vedlikehold</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kjøpsdato
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notater
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Ekstra informasjon om utstyret..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              aria-label="Lagre endringer"
            >
              <FaSave />
              {loading ? 'Lagrer...' : 'Lagre endringer'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              aria-label="Slett utstyr"
            >
              <FaTrash />
              Slett
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Bekreft sletting</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Er du sikker på at du vil slette <strong>{equipment.name}</strong>?
              Dette vil også slette all vedlikeholdshistorikk for dette utstyret.
              Denne handlingen kan ikke angres.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-manipulation min-h-[44px]"
                aria-label="Avbryt sletting"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                aria-label="Bekreft sletting"
              >
                {loading ? 'Sletter...' : 'Ja, slett'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
