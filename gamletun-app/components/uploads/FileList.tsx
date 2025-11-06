'use client';

import { useState } from 'react';
import { FaTrash, FaDownload, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFile, FaSpinner } from 'react-icons/fa';
import { formatFileSize, deleteFile, getSignedUrl, type StorageBucket } from '@/lib/storage';

export interface FileItem {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  created_at: string;
}

interface FileListProps {
  files: FileItem[];
  bucket: StorageBucket;
  onFileDeleted: (fileId: string, filePath: string) => void;
  emptyMessage?: string;
  showDescription?: boolean;
}

export default function FileList({
  files,
  bucket,
  onFileDeleted,
  emptyMessage = 'Ingen filer lastet opp',
  showDescription = false,
}: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getFileIcon = (type?: string) => {
    if (!type) return <FaFile className="text-gray-600" />;
    if (type === 'application/pdf') return <FaFilePdf className="text-red-600" />;
    if (type.includes('word')) return <FaFileWord className="text-blue-600" />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FaFileExcel className="text-green-600" />;
    if (type.startsWith('image/')) return <FaFileImage className="text-purple-600" />;
    return <FaFile className="text-gray-600" />;
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Er du sikker på at du vil slette "${file.file_name}"?`)) {
      return;
    }

    setDeletingId(file.id);

    try {
      // Delete from storage
      await deleteFile(bucket, file.file_path);

      // Notify parent
      onFileDeleted(file.id, file.file_path);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Kunne ikke slette filen: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: FileItem) => {
    setDownloadingId(file.id);

    try {
      // Get signed URL
      const url = await getSignedUrl(bucket, file.file_path);

      // Open in new tab or trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Download error:', error);
      alert('Kunne ikke laste ned filen: ' + error.message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FaFile className="text-4xl text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* File Icon */}
            <div className="text-2xl mt-0.5 flex-shrink-0">
              {getFileIcon(file.file_type)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {file.file_name}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {file.file_size && (
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)}
                  </span>
                )}
                {file.file_size && file.created_at && (
                  <span className="text-gray-300">•</span>
                )}
                {file.created_at && (
                  <span className="text-xs text-gray-500">
                    {new Date(file.created_at).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              {showDescription && file.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {file.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingId === file.id || deletingId === file.id}
                className="p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Last ned fil"
                title="Last ned"
              >
                {downloadingId === file.id ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload />
                )}
              </button>
              <button
                onClick={() => handleDelete(file)}
                disabled={deletingId === file.id || downloadingId === file.id}
                className="p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Slett fil"
                title="Slett"
              >
                {deletingId === file.id ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaTrash />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
