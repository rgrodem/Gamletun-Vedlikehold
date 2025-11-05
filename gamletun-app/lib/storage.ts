// Supabase Storage utility functions
import { createClient } from '@/lib/supabase/client';

export type StorageBucket = 'equipment-images' | 'equipment-documents' | 'maintenance-attachments';

export interface UploadResult {
  path: string;
  url: string;
  fullPath: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The storage bucket to upload to
 * @param file - The file to upload
 * @param folder - Optional folder path within the bucket
 * @returns The uploaded file path and URL
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  folder?: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedFileName}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrl,
    fullPath: `${bucket}/${data.path}`,
  };
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket
 * @param path - The file path to delete
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get a signed URL for a private file (valid for 1 hour)
 * @param bucket - The storage bucket
 * @param path - The file path
 * @returns Signed URL
 */
export async function getSignedUrl(bucket: StorageBucket, path: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error || !data) {
    console.error('Signed URL error:', error);
    throw new Error(`Failed to get signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Get file info from a File object
 * @param file - The file to get info from
 */
export function getFileInfo(file: File): FileInfo {
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns true if valid, false otherwise
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Validate file type
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, false otherwise
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Get appropriate icon for file type
 */
export function getFileTypeIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  return '📎';
}

/**
 * Compress image before upload (simple client-side compression)
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
