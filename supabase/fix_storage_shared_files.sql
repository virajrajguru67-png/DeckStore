-- Fix storage RLS policies to allow users with file_permissions to access shared files
-- The issue is that the storage policy needs to check file_permissions correctly
-- The storage object 'name' is the full path like 'user-id/timestamp_filename'
-- The files.storage_key should match this exactly

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in their folder" ON storage.objects;

-- Create a helper function to check if user has access to a file by storage path
-- The 'name' parameter is the storage object path (e.g., 'user-id/timestamp_filename')
CREATE OR REPLACE FUNCTION public.user_has_file_access_by_path(storage_path TEXT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the file (file is in their folder)
  IF (storage.foldername(storage_path))[1] = user_id_param::text THEN
    RETURN TRUE;
  END IF;

  -- Check if user has permission via file_permissions
  -- Match by storage_key (which should equal the storage path)
  IF EXISTS (
    SELECT 1 FROM public.files f
    INNER JOIN public.file_permissions fp ON f.id = fp.file_id
    WHERE f.storage_key = storage_path
    AND fp.user_id = user_id_param
    AND fp.permission_type IN ('read', 'write', 'admin')
    AND f.deleted_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has folder permission (inherited)
  IF EXISTS (
    SELECT 1 FROM public.files f
    INNER JOIN public.folders fo ON f.folder_id = fo.id
    INNER JOIN public.folder_permissions fop ON fo.id = fop.folder_id
    WHERE f.storage_key = storage_path
    AND fop.user_id = user_id_param
    AND fop.permission_type IN ('read', 'write', 'admin')
    AND f.deleted_at IS NULL
    AND fo.deleted_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_has_file_access_by_path(TEXT, UUID) TO authenticated;

-- Create new SELECT policy that uses the helper function
-- This allows users to view files they own OR have permission to access
CREATE POLICY "Users can view accessible files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND (
    -- User owns the file (file is in their folder)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User has permission via file_permissions or folder_permissions
    public.user_has_file_access_by_path(name, auth.uid())
  )
);

DO $$ BEGIN
  RAISE NOTICE '✅ Storage RLS policy updated for shared files!';
  RAISE NOTICE '✅ Users with file_permissions can now access shared files!';
END $$;

