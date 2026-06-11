'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaCamera, FaTrash, FaFileAlt } from 'react-icons/fa';
import {
  WorkOrderAttachment,
  getWorkOrderAttachments,
  uploadWorkOrderAttachment,
  deleteWorkOrderAttachment,
} from '@/lib/work-order-attachments';

interface WorkOrderAttachmentsSectionProps {
  workOrderId: string;
  readOnly?: boolean;
}

/**
 * Viser og laster opp bilder på en arbeidsordre (f.eks. foto av feilen
 * før/etter utbedring). Brukes i WorkOrderDetailModal.
 */
export default function WorkOrderAttachmentsSection({ workOrderId, readOnly = false }: WorkOrderAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkOrderAttachments(workOrderId)
      .then((data) => { if (!cancelled) setAttachments(data); })
      .catch((err) => console.error('Error loading attachments:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workOrderId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (files.some(f => f.size > 40 * 1024 * 1024)) {
      setError('Noen filer er for store. Maks 40 MB per fil.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const attachment = await uploadWorkOrderAttachment(workOrderId, file);
        setAttachments(prev => [...prev, attachment]);
      }
    } catch (err) {
      console.error('Error uploading attachment:', err);
      setError('Kunne ikke laste opp bilde');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: WorkOrderAttachment) => {
    if (!confirm('Slette dette bildet?')) return;
    try {
      await deleteWorkOrderAttachment(attachment);
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setError('Kunne ikke slette bilde');
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-16" />;
  }

  if (attachments.length === 0 && readOnly) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Bilder ({attachments.length})
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="relative group aspect-square">
            {attachment.file_type?.startsWith('image/') && attachment.url ? (
              <button
                type="button"
                onClick={() => setSelectedImage(attachment.url!)}
                className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200"
              >
                <Image
                  src={attachment.url}
                  alt={attachment.file_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 25vw"
                />
              </button>
            ) : attachment.url ? (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-500 text-xs p-1"
              >
                <FaFileAlt className="text-lg" />
                <span className="truncate max-w-full">{attachment.file_name}</span>
              </a>
            ) : (
              <div className="w-full h-full rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 text-xs p-1">
                <FaFileAlt className="text-lg" />
                <span className="truncate max-w-full">{attachment.file_name}</span>
              </div>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(attachment)}
                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                aria-label="Slett bilde"
              >
                <FaTrash className="text-[10px]" />
              </button>
            )}
          </div>
        ))}

        {!readOnly && (
          <label className="aspect-square cursor-pointer border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-gray-400 transition-colors">
            <FaCamera className="text-lg" />
            <span className="text-[11px] font-medium">{uploading ? 'Laster…' : 'Legg til'}</span>
            <input
              type="file"
              onChange={handleUpload}
              accept="image/*"
              multiple
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedImage}
              alt="Vedlegg"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
        </div>
      )}
    </div>
  );
}
