'use client';

import { useState, useEffect } from 'react';
import { FaTools, FaCalendar, FaEdit, FaFilePdf, FaFileAlt, FaDownload } from 'react-icons/fa';
import Image from 'next/image';
import EditMaintenanceModal from './EditMaintenanceModal';
import { createClient } from '@/lib/supabase/client';

interface MaintenanceLog {
  id: string;
  description: string | null;
  performed_date: string;
  created_at: string;
  maintenance_type: {
    type_name: string;
  } | null;
  performed_by_profile?: {
    id: string;
    full_name: string;
  } | null;
}

interface MaintenanceAttachment {
  id: string;
  maintenance_log_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  attachment_type: string | null;
  created_at: string;
}

interface MaintenanceHistoryProps {
  logs: MaintenanceLog[];
  equipmentName: string;
  onUpdate: () => void;
}

export default function MaintenanceHistory({ logs, equipmentName, onUpdate }: MaintenanceHistoryProps) {
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [attachments, setAttachments] = useState<Record<string, MaintenanceAttachment[]>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadAllAttachments();
  }, [logs]);

  const loadAllAttachments = async () => {
    if (logs.length === 0) return;

    try {
      const logIds = logs.map(log => log.id);
      const { data, error } = await supabase
        .from('maintenance_attachments')
        .select('*')
        .in('maintenance_log_id', logIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group attachments by log ID
      const grouped: Record<string, MaintenanceAttachment[]> = {};
      data?.forEach(attachment => {
        if (!grouped[attachment.maintenance_log_id]) {
          grouped[attachment.maintenance_log_id] = [];
        }
        grouped[attachment.maintenance_log_id].push(attachment);
      });

      setAttachments(grouped);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('maintenance-attachments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = (attachment: MaintenanceAttachment) => {
    const url = getFileUrl(attachment.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.file_name;
    link.click();
  };

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center">
        <FaTools className="text-3xl text-ink3 mx-auto mb-3" />
        <p className="text-ink font-medium text-[15px]">Ingen vedlikeholdshistorikk ennå</p>
        <p className="text-[13px] text-ink3 mt-1">Trykk «Logg vedlikehold» for å legge til</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <>
      <div>
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 border-t border-line first:border-t-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-mossBg rounded-[10px] flex-shrink-0">
                  <FaTools className="text-moss" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-ink text-[15px] truncate">
                    {log.maintenance_type?.type_name || 'Vedlikehold'}
                  </h4>
                  <div className="flex items-center gap-2 text-[12px] text-ink3 mt-0.5 flex-wrap">
                    <FaCalendar className="text-[10px]" />
                    <span>{formatDate(log.performed_date)}</span>
                    {log.performed_by_profile && (
                      <>
                        <span className="text-line">•</span>
                        <span>{log.performed_by_profile.full_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(log)}
                className="p-2 -mr-1 text-ink3 hover:text-ink rounded-lg transition-colors flex-shrink-0"
                title="Rediger vedlikehold"
              >
                <FaEdit />
              </button>
            </div>

            {log.description && (
              <p className="text-ink2 text-[13px] leading-relaxed bg-bg rounded-[10px] p-3 mt-3 break-words">
                {log.description}
              </p>
            )}

            {/* Attachments */}
            {attachments[log.id] && attachments[log.id].length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-ink3 mb-2 uppercase tracking-[0.06em]">Vedlegg</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {attachments[log.id].map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/');
                    const fileUrl = getFileUrl(attachment.file_path);

                    return (
                      <div key={attachment.id} className="relative group">
                        {isImage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedImage(fileUrl)}
                            aria-label={`Vis ${attachment.file_name}`}
                            className="relative w-full aspect-square rounded-[10px] overflow-hidden border border-line hover:border-ink/30 transition-all cursor-pointer"
                          >
                            <Image
                              src={fileUrl}
                              alt={attachment.file_name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownload(attachment)}
                            className="w-full aspect-square rounded-[10px] overflow-hidden border border-line hover:border-ink/30 transition-all cursor-pointer bg-bg flex flex-col items-center justify-center gap-2 p-2"
                          >
                            {attachment.file_type === 'application/pdf' ? (
                              <FaFilePdf className="text-3xl text-rust" />
                            ) : (
                              <FaFileAlt className="text-3xl text-ink3" />
                            )}
                            <p className="text-[11px] text-ink3 text-center truncate w-full px-1">
                              {attachment.file_name}
                            </p>
                            <FaDownload className="text-[10px] text-moss" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
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

      {/* Edit Modal */}
      {editingLog && (
        <EditMaintenanceModal
          log={editingLog}
          equipmentName={equipmentName}
          onClose={() => setEditingLog(null)}
          onSuccess={() => {
            setEditingLog(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
