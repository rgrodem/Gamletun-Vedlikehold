-- Supabase Storage Setup
-- This script sets up the storage buckets and policies for file uploads

-- Note: Storage buckets are usually created via the Supabase Dashboard UI
-- But these policies can be applied after bucket creation

-- IMPORTANT: This script can be run multiple times safely
-- It will drop existing policies before recreating them

-- =================================================================
-- 1. Equipment Images Bucket Policies
-- =================================================================
-- Bucket name: 'equipment-images'
-- Public: false (only authenticated users)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON storage.objects;

-- Create policies
CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can view equipment images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can update equipment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can delete equipment images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');

-- =================================================================
-- 2. Equipment Documents Bucket Policies
-- =================================================================
-- Bucket name: 'equipment-documents'
-- Public: false

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload equipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view equipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update equipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete equipment documents" ON storage.objects;

-- Create policies
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

-- =================================================================
-- 3. Maintenance Attachments Bucket Policies
-- =================================================================
-- Bucket name: 'maintenance-attachments'
-- Public: false

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload maintenance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view maintenance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance attachments" ON storage.objects;

-- Create policies
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
