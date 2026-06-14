'use client';

import { useState } from 'react';
import { FaTimes, FaSave, FaTrash } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import ImageUpload from '../uploads/ImageUpload';
import { deleteFile } from '@/lib/storage';
import { refreshEquipmentStatus } from '@/lib/equipment-status';
import { useModalBehavior } from '@/lib/use-modal-behavior';

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
  usage_hours?: number | null;
  registration_number?: string | null;
  total_weight_kg?: number | null;
  curb_weight_kg?: number | null;
  tire_dimension?: string | null;
}

interface EditEquipmentModalProps {
  equipment: Equipment;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

// Tolk et tallfelt (vekt) til heltall, eller null hvis tomt/ugyldig.
function parseIntOrNull(value: string): number | null {
  const parsed = parseInt(value.replace(/\s/g, ''), 10);
  return value.trim() && !isNaN(parsed) ? parsed : null;
}

export default function EditEquipmentModal({ equipment, categories, onClose, onSuccess }: EditEquipmentModalProps) {
  useModalBehavior(onClose);
  const [name, setName] = useState(equipment.name);
  const [model, setModel] = useState(equipment.model || '');
  const [serialNumber, setSerialNumber] = useState(equipment.serial_number || '');
  const [purchaseDate, setPurchaseDate] = useState(equipment.purchase_date || '');
  const [usageHours, setUsageHours] = useState(
    equipment.usage_hours != null ? String(equipment.usage_hours) : ''
  );
  const [registrationNumber, setRegistrationNumber] = useState(equipment.registration_number || '');
  const [totalWeight, setTotalWeight] = useState(
    equipment.total_weight_kg != null ? String(equipment.total_weight_kg) : ''
  );
  const [curbWeight, setCurbWeight] = useState(
    equipment.curb_weight_kg != null ? String(equipment.curb_weight_kg) : ''
  );
  const [tireDimension, setTireDimension] = useState(equipment.tire_dimension || '');
  // Only the manual drift-status is editable here. "in_use"/"maintenance" are
  // derived from reservations/work orders, so map those to "active" (in drift).
  const [status, setStatus] = useState(equipment.status === 'inactive' ? 'inactive' : 'active');
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
          usage_hours: (() => {
            // Tåler komma som desimaltegn; ugyldig tekst lagres som tomt.
            const parsed = parseFloat(usageHours.replace(',', '.'));
            return usageHours.trim() && !isNaN(parsed) ? parsed : null;
          })(),
          registration_number: registrationNumber.trim().toUpperCase() || null,
          total_weight_kg: parseIntOrNull(totalWeight),
          curb_weight_kg: parseIntOrNull(curbWeight),
          tire_dimension: tireDimension.trim() || null,
          status,
          category_id: categoryId || null,
          notes: notes.trim() || null,
          image_url: imageUrl,
        })
        .eq('id', equipment.id);

      if (updateError) throw updateError;

      // Recompute derived status (in_use/maintenance) from reservations/work
      // orders so the manual change reconciles instead of being overwritten later.
      await refreshEquipmentStatus(equipment.id);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl flex justify-between items-center z-10">
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
                Driftstatus *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">I drift</option>
                <option value="inactive">Ute av drift</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                «I bruk» og «Under vedlikehold» settes automatisk fra reservasjoner og arbeidsordrer.
              </p>
            </div>
          </div>

          {/* Purchase Date + Usage Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeteller (driftstimer)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={usageHours}
                onChange={(e) => setUsageHours(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="F.eks. 1250"
              />
              <p className="text-xs text-gray-500 mt-1">
                Avlest fra maskinens timeteller. Brukes til timebasert vedlikehold.
              </p>
            </div>
          </div>

          {/* Kjøretøy / tilhenger (valgfritt) */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Kjøretøy / tilhenger</h3>
            <p className="text-xs text-gray-500 mb-3">
              Valgfritt — fyll inn for tilhengere og registrerte kjøretøy.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registreringsnummer
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="F.eks. RU 4033"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dekkdimensjon
                  </label>
                  <input
                    type="text"
                    value={tireDimension}
                    onChange={(e) => setTireDimension(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="F.eks. 155 R 13"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tillatt totalvekt (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="F.eks. 2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Egenvekt (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={curbWeight}
                    onChange={(e) => setCurbWeight(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="F.eks. 345"
                  />
                </div>
              </div>
            </div>
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
