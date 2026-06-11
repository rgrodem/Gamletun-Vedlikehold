'use client';

import { useEffect, useState } from 'react';
import { FaTimes, FaExclamationTriangle, FaCamera, FaImage, FaTrash } from 'react-icons/fa';
import { createWorkOrder, WorkOrderPriority } from '@/lib/work-orders';
import { getActiveReservationForEquipment } from '@/lib/reservations';
import { uploadWorkOrderAttachment } from '@/lib/work-order-attachments';
import { formatFileSize } from '@/lib/storage';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface Equipment {
  id: string;
  name: string;
}

interface ReportFaultModalProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportFaultModal({ equipment, onClose, onSuccess }: ReportFaultModalProps) {
  useModalBehavior(onClose);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservedBy, setReservedBy] = useState<{ name: string; from: string } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (newFiles.some(f => f.size > 40 * 1024 * 1024)) {
      setError('Noen filer er for store. Maks 40 MB per fil.');
      return;
    }
    setPhotos(prev => [...prev, ...newFiles]);
  };

  // Warn the reporter if this equipment is already reserved by someone — they
  // should be told it's now defective. (Email notification is a later step.)
  useEffect(() => {
    let cancelled = false;
    getActiveReservationForEquipment(equipment.id)
      .then((res) => {
        if (cancelled || !res) return;
        setReservedBy({
          name: res.user_profile?.full_name || 'en bruker',
          from: new Date(res.start_time).toLocaleString('nb-NO', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          }),
        });
      })
      .catch((err) => {
        console.error('Failed to check active reservation:', err);
      });
    return () => { cancelled = true; };
  }, [equipment.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const workOrder = await createWorkOrder({
        equipment_id: equipment.id,
        type: 'corrective',
        priority,
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
      });

      // Last opp foto av feilen. Feilmeldingen er allerede opprettet, så en
      // feilet opplasting skal ikke stoppe flyten — bare logges.
      for (const photo of photos) {
        try {
          await uploadWorkOrderAttachment(workOrder.id, photo);
        } catch (uploadError) {
          console.error('Error uploading fault photo:', uploadError);
        }
      }

      // E-postvarsel i bakgrunnen — skal aldri blokkere innmeldingen.
      fetch('/api/notify/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: workOrder.id }),
      }).catch((notifyError) => console.error('E-postvarsel feilet:', notifyError));

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error creating fault report:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke opprette feilmelding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-labelledby="fault-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8">
        {/* Header */}
        <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <FaExclamationTriangle className="text-2xl text-red-600" />
            </div>
            <div>
              <h2 id="fault-modal-title" className="text-2xl font-bold text-gray-900">Meld feil</h2>
              <p className="text-sm text-gray-600">{equipment.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {reservedBy && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
              <FaExclamationTriangle className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-900 text-sm">
                <strong>OBS:</strong> dette utstyret er reservert av{' '}
                <strong>{reservedBy.name}</strong> fra {reservedBy.from}. Gi beskjed om at
                utstyret nå er meldt defekt.
                {priority === 'low'
                  ? ' Denne feilen har lav prioritet og blokkerer ikke nye reservasjoner.'
                  : ' Når feilen er åpen kan utstyret ikke reserveres på nytt.'}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tittel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
              placeholder="F.eks. Hydraulikk-lekkasje, Lys defekt, Motor starter ikke"
            />
            <p className="text-xs text-gray-500 mt-1">Kort beskrivelse av feilen</p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prioritet <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as WorkOrderPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all border-2 touch-manipulation min-h-[44px] ${
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-red-500 text-white border-red-600'
                        : p === 'high'
                        ? 'bg-orange-500 text-white border-orange-600'
                        : p === 'medium'
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-gray-500 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {p === 'urgent' ? 'Akutt' : p === 'high' ? 'Høy' : p === 'medium' ? 'Medium' : 'Lav'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {priority === 'low'
                ? 'Lav prioritet er for kosmetiske feil (f.eks. sprukket lyktglass). Utstyret kan fortsatt reserveres og brukes.'
                : 'Utstyret kan ikke reserveres før feilen er utbedret.'}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detaljert beskrivelse av problemet..."
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Foto av feilen (valgfritt)
            </label>
            <label className="block cursor-pointer border border-dashed border-gray-300 rounded-xl px-5 py-5 text-center text-gray-500 hover:border-gray-400 transition-colors">
              <span className="inline-flex items-center gap-2">
                <FaCamera className="text-[16px]" />
                <span className="text-sm font-medium">Ta bilde eller last opp</span>
              </span>
              <input
                type="file"
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {photos.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <FaImage className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                      className="p-2 text-red-600 rounded-lg"
                      aria-label="Fjern bilde"
                    >
                      <FaTrash className="text-[12px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Frist (valgfritt)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <span>Melder feil...</span>
              ) : (
                <>
                  <FaExclamationTriangle />
                  <span>Meld feil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
