'use client';

import { useState } from 'react';
import { FaTools, FaTimes, FaImage, FaFileAlt, FaTrash } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, formatFileSize } from '@/lib/storage';

interface Equipment {
  id: string;
  name: string;
  model: string | null;
}

interface LogMaintenanceModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogMaintenanceModal({ equipment, onClose, onSuccess }: LogMaintenanceModalProps) {
  const [typeValue, setTypeValue] = useState('');
  const [description, setDescription] = useState('');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Check file sizes (max 10MB each)
      const invalidFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        alert(`Noen filer er for store. Maksimal størrelse er 10 MB per fil.`);
        return;
      }

      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Du må være innlogget for å logge vedlikehold');
        setLoading(false);
        return;
      }

      // First, create or get maintenance type
      let maintenanceTypeId = null;

      if (typeValue) {
        // Check if this type exists for this equipment
        const { data: existingType } = await supabase
          .from('maintenance_types')
          .select('id')
          .eq('equipment_id', equipment.id)
          .eq('type_name', typeValue)
          .single();

        if (existingType) {
          maintenanceTypeId = existingType.id;
        } else {
          // Create new maintenance type
          const { data: newType, error: typeError } = await supabase
            .from('maintenance_types')
            .insert({
              equipment_id: equipment.id,
              type_name: typeValue,
            })
            .select()
            .single();

          if (typeError) throw typeError;
          maintenanceTypeId = newType.id;
        }
      }

      // Create maintenance log with current user as performed_by
      const { data: newLog, error: logError } = await supabase
        .from('maintenance_logs')
        .insert({
          equipment_id: equipment.id,
          maintenance_type_id: maintenanceTypeId,
          description: description || null,
          performed_date: performedDate,
          performed_by: user.id,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Upload attachments if any
      if (attachments.length > 0 && newLog) {
        for (const file of attachments) {
          try {
            // Upload file to storage
            const result = await uploadFile('maintenance-attachments', file, newLog.id);

            // Determine attachment type
            const attachmentType = file.type.startsWith('image/') ? 'image' :
                                   file.type === 'application/pdf' ? 'document' : 'form';

            // Save attachment record to database
            await supabase
              .from('maintenance_attachments')
              .insert({
                maintenance_log_id: newLog.id,
                file_name: file.name,
                file_path: result.path,
                file_size: file.size,
                file_type: file.type,
                attachment_type: attachmentType,
                uploaded_by: user.id,
              });
          } catch (uploadError) {
            console.error('Error uploading attachment:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error logging maintenance:', err);
      setError(err.message || 'Kunne ikke logge vedlikehold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Logg Vedlikehold</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{equipment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-lg sm:text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type arbeid <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="F.eks. Smøring, Oljeskift, Rust-inspeksjon"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tips: Oljeskift, Smøring, Rust-inspeksjon, Dekktrykk, Filterskift
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Beskriv hva som ble gjort..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dato utført <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={performedDate}
              onChange={(e) => setPerformedDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vedlegg (bilder/dokumenter)
            </label>
            <div className="space-y-3">
              {/* File input */}
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                  multiple
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">
                Last opp bilder av utført arbeid, vedlikeholdsskjema eller annen dokumentasjon (maks 10 MB per fil)
              </p>

              {/* Selected files list */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {file.type.startsWith('image/') ? (
                          <FaImage className="text-blue-500 flex-shrink-0" />
                        ) : (
                          <FaFileAlt className="text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 touch-manipulation min-w-[40px] min-h-[40px]"
                        aria-label="Fjern fil"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
              aria-label="Avbryt og lukk"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !typeValue}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
              aria-label="Logg vedlikehold"
            >
              {loading ? (
                <span>Lagrer...</span>
              ) : (
                <>
                  <FaTools />
                  <span>Logg</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
