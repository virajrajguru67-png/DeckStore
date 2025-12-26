-- Create functions for permanent delete (bypasses RLS)
-- This allows users to permanently delete files and folders from recycle bin
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create function to permanently delete files
-- ============================================
CREATE OR REPLACE FUNCTION permanently_delete_file(file_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_owner_id UUID;
  file_storage_key TEXT;
BEGIN
  -- Get the file owner and storage key
  SELECT owner_id, storage_key INTO file_owner_id, file_storage_key
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
  
  -- Delete from storage if storage_key exists
  IF file_storage_key IS NOT NULL THEN
    -- Note: Storage deletion is handled by the application code
    -- This function only handles database deletion
  END IF;
  
  -- Permanently delete from database
  DELETE FROM files
  WHERE id = file_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 2: Create function to permanently delete folders
-- ============================================
CREATE OR REPLACE FUNCTION permanently_delete_folder(folder_id_param UUID)
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
  
  -- Note: In a production system, you might want to also delete all files and subfolders
  -- For now, we'll just delete the folder record
  -- Files and subfolders will be orphaned (you may want to handle this differently)
  
  -- Permanently delete from database
  DELETE FROM folders
  WHERE id = folder_id_param;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 3: Grant execute permission
-- ============================================
GRANT EXECUTE ON FUNCTION permanently_delete_file(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_folder(UUID) TO authenticated;

-- ============================================
-- STEP 4: Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Permanent delete functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - permanently_delete_file(file_id)';
  RAISE NOTICE '  - permanently_delete_folder(folder_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'These functions bypass RLS and check ownership internally.';
  RAISE NOTICE 'The application code will use these functions for permanent delete.';
END $$;

