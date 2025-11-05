'use client';

import { useState, useRef } from 'react';
import { FaCamera, FaTimes, FaSpinner } from 'react-icons/fa';
import Image from 'next/image';
import { uploadFile, deleteFile, formatFileSize, validateFileSize, validateFileType, compressImage, type StorageBucket } from '@/lib/storage';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string, path: string) => void;
  onImageRemoved?: () => void;
  bucket: StorageBucket;
  folder?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucket,
  folder,
  maxSizeMB = 15,
  label = 'Last opp bilde',
  description,
  aspectRatio = 'square',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[16/9]',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    if (!validateFileType(file, allowedTypes)) {
      setError('Kun bilder er tillatt (JPEG, PNG, WebP, HEIC)');
      return;
    }

    // Validate file size
    if (!validateFileSize(file, maxSizeMB)) {
      setError(`Bildet er for stort. Maksimal størrelse er ${maxSizeMB} MB`);
      return;
    }

    try {
      setUploading(true);

      // Compress image if it's larger than 1MB
      let fileToUpload: File | Blob = file;
      if (file.size > 1024 * 1024) {
        const compressed = await compressImage(file);
        fileToUpload = new File([compressed], file.name, { type: 'image/jpeg' });
      }

      // Upload to Supabase Storage
      const result = await uploadFile(bucket, fileToUpload as File, folder);

      // Set preview
      setPreview(result.url);

      // Notify parent
      onImageUploaded(result.url, result.path);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Kunne ikke laste opp bilde');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
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

      <div className={`relative w-full ${aspectClasses[aspectRatio]} bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors`}>
        {preview ? (
          <>
            {/* Image Preview */}
            <div className="relative w-full h-full">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg touch-manipulation"
              aria-label="Fjern bilde"
            >
              <FaTimes className="text-sm" />
            </button>

            {/* Change Button */}
            <button
              type="button"
              onClick={handleClick}
              disabled={uploading}
              className="absolute bottom-2 right-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg text-xs font-medium touch-manipulation"
            >
              Endre
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-blue-600 transition-colors touch-manipulation"
          >
            {uploading ? (
              <>
                <FaSpinner className="text-3xl animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Laster opp...</span>
              </>
            ) : (
              <>
                <div className="p-4 bg-gray-200 rounded-full">
                  <FaCamera className="text-3xl" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium">Klikk for å laste opp bilde</p>
                  <p className="text-xs text-gray-400 mt-1">Maks {maxSizeMB} MB</p>
                </div>
              </>
            )}
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
