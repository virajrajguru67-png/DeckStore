-- Diagnostic script to troubleshoot file preview issues
-- Run this in Supabase SQL Editor to check file access
-- 
-- INSTRUCTIONS:
-- 1. Replace '1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg' with your actual file name or storage_key
-- 2. Run each query section separately to see the results

-- ============================================================
-- Step 1: Find the file in the database
-- Replace 'YOUR_FILE_NAME' with the actual file name or part of it
-- ============================================================
SELECT 
  f.id,
  f.name,
  f.storage_key,
  f.owner_id,
  f.folder_id,
  p.email as owner_email,
  f.deleted_at,
  f.created_at
FROM public.files f
LEFT JOIN public.profiles p ON f.owner_id = p.id
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
ORDER BY f.created_at DESC
LIMIT 5;

-- ============================================================
-- Step 2: Check if the current user has permission
-- This checks ownership, file permissions, and folder permissions
-- ============================================================
SELECT 
  f.id as file_id,
  f.name as file_name,
  f.storage_key,
  f.owner_id,
  auth.uid() as current_user_id,
  -- Check ownership
  (f.owner_id = auth.uid()) as is_owner,
  -- Check file permissions
  EXISTS (
    SELECT 1 FROM public.file_permissions fp
    WHERE fp.file_id = f.id
    AND fp.user_id = auth.uid()
    AND fp.permission_type IN ('read', 'write', 'admin')
  ) as has_file_permission,
  -- Check folder permissions (inherited)
  EXISTS (
    SELECT 1 FROM public.folders fo
    INNER JOIN public.folder_permissions fop ON fo.id = fop.folder_id
    WHERE fo.id = f.folder_id
    AND fop.user_id = auth.uid()
    AND fop.permission_type IN ('read', 'write', 'admin')
    AND fo.deleted_at IS NULL
  ) as has_folder_permission,
  -- Test the helper function
  public.user_has_file_access_by_path(f.storage_key, auth.uid()) as helper_function_result
FROM public.files f
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
LIMIT 1;

-- ============================================================
-- Step 3: Check file permissions for this file
-- Shows all users who have permissions on this file
-- ============================================================
SELECT 
  f.id as file_id,
  f.name as file_name,
  f.storage_key,
  fp.user_id,
  fp.permission_type,
  p.email as user_email,
  fp.created_at as permission_created_at
FROM public.files f
LEFT JOIN public.file_permissions fp ON f.id = fp.file_id
LEFT JOIN public.profiles p ON fp.user_id = p.id
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
ORDER BY fp.created_at DESC;

-- ============================================================
-- Step 4: Check folder permissions if file is in a folder
-- Shows folder-level permissions that might grant access
-- ============================================================
SELECT 
  f.id as file_id,
  f.name as file_name,
  f.folder_id,
  fo.name as folder_name,
  fop.user_id,
  fop.permission_type,
  p.email as user_email,
  fop.created_at as permission_created_at
FROM public.files f
LEFT JOIN public.folders fo ON f.folder_id = fo.id
LEFT JOIN public.folder_permissions fop ON fo.id = fop.folder_id
LEFT JOIN public.profiles p ON fop.user_id = p.id
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
ORDER BY fop.created_at DESC;

-- ============================================================
-- Step 5: Verify storage_key format
-- Storage keys should be in format: {user_id}/{timestamp}_{filename}
-- Check if the storage_key matches this format
-- ============================================================
SELECT 
  f.id,
  f.name,
  f.storage_key,
  f.owner_id,
  -- Extract user ID from storage_key (first part before /)
  (storage.foldername(f.storage_key))[1] as storage_user_id,
  -- Check if storage_key format is correct
  CASE 
    WHEN f.storage_key LIKE (f.owner_id::text || '/%') THEN '✅ Format correct'
    WHEN f.storage_key NOT LIKE '%/%' THEN '❌ Missing user_id prefix - should be {user_id}/{filename}'
    ELSE '❌ Format mismatch - storage_key should start with owner_id/'
  END as format_check,
  -- Show expected format
  (f.owner_id::text || '/timestamp_' || f.name) as expected_format_example
FROM public.files f
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
LIMIT 1;

-- ============================================================
-- Step 6: Test the helper function directly
-- This tests if the user_has_file_access_by_path function works
-- ============================================================
SELECT 
  f.storage_key,
  auth.uid() as current_user_id,
  public.user_has_file_access_by_path(
    f.storage_key,
    auth.uid()
  ) as can_access,
  CASE 
    WHEN public.user_has_file_access_by_path(f.storage_key, auth.uid()) THEN '✅ User CAN access this file'
    ELSE '❌ User CANNOT access this file - check permissions'
  END as access_status
FROM public.files f
WHERE f.name LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
   OR f.storage_key LIKE '%1355d4a4-8a54-488a-8587-b4de8d5c5c53-1.jpg%'
LIMIT 1;

-- ============================================================
-- QUICK FIX: If storage_key format is wrong, you can update it
-- (Only run this if Step 5 shows format mismatch)
-- ============================================================
-- Example: If storage_key is missing user_id prefix
-- UPDATE public.files 
-- SET storage_key = owner_id::text || '/' || storage_key
-- WHERE id = 'YOUR_FILE_ID_HERE'
--   AND storage_key NOT LIKE '%/%';

