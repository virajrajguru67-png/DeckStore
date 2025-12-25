-- Fix delete using a SECURITY DEFINER function
-- This bypasses RLS for the update operation
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create function to soft delete folders
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_folder(folder_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_owner_id UUID;
BEGIN
  -- Get the folder owner
  SELECT owner_id INTO folder_owner_id
  FROM folders
  WHERE id = folder_id_param;
  
  -- Check if folder exists
  IF folder_owner_id IS NULL THEN
    RAISE EXCEPTION 'Folder not found';
  END IF;
  
  -- Check if current user is the owner
  IF folder_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: You do not own this folder';
  END IF;
  
  -- Perform the soft delete
  UPDATE folders
  SET deleted_at = now()
  WHERE id = folder_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 2: Create function to soft delete files
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_file(file_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_owner_id UUID;
BEGIN
  -- Get the file owner
  SELECT owner_id INTO file_owner_id
  FROM files
  WHERE id = file_id_param;
  
  -- Check if file exists
  IF file_owner_id IS NULL THEN
    RAISE EXCEPTION 'File not found';
  END IF;
  
  -- Check if current user is the owner
  IF file_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: You do not own this file';
  END IF;
  
  -- Perform the soft delete
  UPDATE files
  SET deleted_at = now()
  WHERE id = file_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 3: Grant execute permission
-- ============================================
GRANT EXECUTE ON FUNCTION soft_delete_folder(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_file(UUID) TO authenticated;

-- ============================================
-- STEP 4: Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - soft_delete_folder(folder_id)';
  RAISE NOTICE '  - soft_delete_file(file_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'These functions bypass RLS and check ownership internally.';
  RAISE NOTICE 'Update fileService.ts to use these functions instead of direct UPDATE.';
END $$;

