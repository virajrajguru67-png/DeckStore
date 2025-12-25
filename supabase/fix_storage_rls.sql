-- Quick fix for Storage RLS policies - Run this in Supabase SQL Editor
-- This fixes the file upload storage bucket access issue

-- First, ensure the 'files' bucket exists (create if it doesn't)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('files', 'files', false, 52428800, NULL) -- 50MB default limit
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload files to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete accessible files" ON storage.objects;

-- Policy: Authenticated users can upload files to their own folder
-- Files are stored as: {user_id}/{timestamp}_{filename}
CREATE POLICY "Users can upload files to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view files in their own folder
-- This is a simplified version - you can add permission checks later
CREATE POLICY "Users can view files in their folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update files in their own folder
CREATE POLICY "Users can update files in their folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete files in their own folder
CREATE POLICY "Users can delete files in their folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

