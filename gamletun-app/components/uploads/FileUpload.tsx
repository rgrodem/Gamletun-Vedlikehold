'use client';

import { useState, useRef } from 'react';
import { FaUpload, FaSpinner, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFile } from 'react-icons/fa';
import { uploadFile, formatFileSize, validateFileSize, validateFileType, getFileTypeIcon, type StorageBucket } from '@/lib/storage';

interface FileUploadProps {
  onFileUploaded: (url: string, path: string, fileName: string, fileSize: number, fileType: string) => void;
  bucket: StorageBucket;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  label?: string;
  description?: string;
  multiple?: boolean;
}

export default function FileUpload({
  onFileUploaded,
  bucket,
  folder,
  maxSizeMB = 40,
  allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  label = 'Last opp fil',
  description = 'PDF, Word, Excel, eller bilder',
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setUploadProgress(`Laster opp ${i + 1} av ${files.length}...`);

        // Validate file type
        if (!validateFileType(file, allowedTypes)) {
          throw new Error(`Filtype ikke tillatt: ${file.name}`);
        }

        // Validate file size
        if (!validateFileSize(file, maxSizeMB)) {
          throw new Error(`Filen er for stor: ${file.name}. Maksimal størrelse er ${maxSizeMB} MB`);
        }

        // Upload to Supabase Storage
        const result = await uploadFile(bucket, file, folder);

        // Notify parent
        onFileUploaded(result.url, result.path, file.name, file.size, file.type);
      }

      setUploadProgress(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Kunne ikke laste opp fil');
      setUploadProgress(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <FaFilePdf className="text-red-600" />;
    if (type.includes('word')) return <FaFileWord className="text-blue-600" />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FaFileExcel className="text-green-600" />;
    if (type.startsWith('image/')) return <FaFileImage className="text-purple-600" />;
    return <FaFile className="text-gray-600" />;
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="w-full flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[120px]"
      >
        {uploading ? (
          <>
            <FaSpinner className="text-3xl animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              {uploadProgress || 'Laster opp...'}
            </span>
          </>
        ) : (
          <>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUpload className="text-2xl text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Klikk for å laste opp {multiple ? 'filer' : 'fil'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {description} • Maks {maxSizeMB} MB
              </p>
            </div>
          </>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
