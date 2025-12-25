-- Fix shared resource names fetching
-- Create a SECURITY DEFINER function to fetch folder/file names for shared resources
-- This bypasses RLS to allow users to see names of resources they have permission to access

-- Function to get folder name by ID (with permission check)
CREATE OR REPLACE FUNCTION public.get_shared_folder_name(folder_id_param UUID, user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_name TEXT;
BEGIN
  -- Check if user has permission to view this folder
  -- Either they own it, or they have a folder_permission
  IF EXISTS (
    SELECT 1 FROM public.folders
    WHERE id = folder_id_param
    AND deleted_at IS NULL
    AND (
      owner_id = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.folder_permissions
        WHERE folder_id = folder_id_param
        AND user_id = user_id_param
        AND permission_type IN ('read', 'write', 'admin')
      )
    )
  ) THEN
    SELECT name INTO folder_name
    FROM public.folders
    WHERE id = folder_id_param;
    
    RETURN folder_name;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to get file name by ID (with permission check)
CREATE OR REPLACE FUNCTION public.get_shared_file_name(file_id_param UUID, user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_name TEXT;
BEGIN
  -- Check if user has permission to view this file
  -- Either they own it, or they have a file_permission, or they have folder permission
  IF EXISTS (
    SELECT 1 FROM public.files
    WHERE id = file_id_param
    AND deleted_at IS NULL
    AND (
      owner_id = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.file_permissions
        WHERE file_id = file_id_param
        AND user_id = user_id_param
        AND permission_type IN ('read', 'write', 'admin')
      ) OR
      EXISTS (
        SELECT 1 FROM public.folders f
        INNER JOIN public.folder_permissions fp ON f.id = fp.folder_id
        WHERE f.id = (SELECT folder_id FROM public.files WHERE id = file_id_param)
        AND fp.user_id = user_id_param
        AND fp.permission_type IN ('read', 'write', 'admin')
        AND f.deleted_at IS NULL
      )
    )
  ) THEN
    SELECT name INTO file_name
    FROM public.files
    WHERE id = file_id_param;
    
    RETURN file_name;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_shared_folder_name(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_file_name(UUID, UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ Shared resource name functions created successfully!';
END $$;

