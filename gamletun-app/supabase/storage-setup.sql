-- Supabase Storage Setup
-- This script sets up the storage buckets and policies for file uploads

-- Note: Storage buckets are usually created via the Supabase Dashboard UI
-- But these policies can be applied after bucket creation

-- 1. Equipment Images Bucket Policies
-- Bucket name: 'equipment-images'
-- Public: false (only authenticated users)

-- Allow authenticated users to upload equipment images
CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

-- Allow authenticated users to view equipment images
CREATE POLICY "Authenticated users can view equipment images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'equipment-images');

-- Allow authenticated users to update equipment images
CREATE POLICY "Authenticated users can update equipment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');

-- Allow authenticated users to delete equipment images
CREATE POLICY "Authenticated users can delete equipment images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');

-- 2. Equipment Documents Bucket Policies
-- Bucket name: 'equipment-documents'
-- Public: false

CREATE POLICY "Authenticated users can upload equipment documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-documents');

CREATE POLICY "Authenticated users can view equipment documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'equipment-documents');

CREATE POLICY "Authenticated users can update equipment documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-documents');

CREATE POLICY "Authenticated users can delete equipment documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-documents');

-- 3. Maintenance Attachments Bucket Policies
-- Bucket name: 'maintenance-attachments'
-- Public: false

CREATE POLICY "Authenticated users can upload maintenance attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-attachments');

CREATE POLICY "Authenticated users can view maintenance attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-attachments');

CREATE POLICY "Authenticated users can update maintenance attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-attachments');

CREATE POLICY "Authenticated users can delete maintenance attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-attachments');
