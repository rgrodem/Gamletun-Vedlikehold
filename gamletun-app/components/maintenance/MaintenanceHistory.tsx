'use client';

import { useState, useEffect } from 'react';
import { FaTools, FaCalendar, FaEdit, FaImage, FaFilePdf, FaFileAlt, FaDownload } from 'react-icons/fa';
import { HiClock } from 'react-icons/hi';
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
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center">
        <FaTools className="text-4xl text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Ingen vedlikeholdshistorikk ennå</p>
        <p className="text-sm text-gray-500 mt-1">Klikk på "Logg Vedlikehold" for å legge til</p>
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
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <HiClock className="text-2xl text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Vedlikeholdshistorikk</h3>
            <p className="text-sm text-gray-600">{equipmentName}</p>
          </div>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                    <FaTools className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {log.maintenance_type?.type_name || 'Vedlikehold'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <FaCalendar className="text-xs" />
                      <span>{formatDate(log.performed_date)}</span>
                      {log.performed_by_profile && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{log.performed_by_profile.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingLog(log)}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Rediger vedlikehold"
                >
                  <FaEdit className="text-lg" />
                </button>
              </div>

              {log.description && (
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg p-3 mt-3">
                  {log.description}
                </p>
              )}

              {/* Attachments */}
              {attachments[log.id] && attachments[log.id].length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Vedlegg:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {attachments[log.id].map((attachment) => {
                      const isImage = attachment.file_type?.startsWith('image/');
                      const fileUrl = getFileUrl(attachment.file_path);

                      return (
                        <div key={attachment.id} className="relative group">
                          {isImage ? (
                            <button
                              onClick={() => setSelectedImage(fileUrl)}
                              className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer"
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
                              onClick={() => handleDownload(attachment)}
                              className="w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer bg-gray-50 flex flex-col items-center justify-center gap-2 p-2"
                            >
                              {attachment.file_type === 'application/pdf' ? (
                                <FaFilePdf className="text-3xl text-red-500" />
                              ) : (
                                <FaFileAlt className="text-3xl text-gray-500" />
                              )}
                              <p className="text-xs text-gray-600 text-center truncate w-full px-1">
                                {attachment.file_name}
                              </p>
                              <FaDownload className="text-xs text-blue-600" />
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
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
