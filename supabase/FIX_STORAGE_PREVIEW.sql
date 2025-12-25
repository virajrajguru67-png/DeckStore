-- Fix: Files exist in bucket but previews don't show
-- IMPORTANT: Storage policies must be created via Supabase Dashboard or CLI
-- This script only creates the helper function and provides instructions
-- This ensures users with READ permission can preview files

-- Step 1: Ensure the helper function exists and works correctly
-- This function checks if a user can access a file via:
-- 1. Admin/Owner role (admins and owners can access all files)
-- 2. File ownership (file in their folder)
-- 3. Direct file_permissions (including READ permission)
-- 4. Inherited folder_permissions (including READ permission)
CREATE OR REPLACE FUNCTION public.user_has_file_access_by_path(storage_path TEXT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Check if user is admin or owner (they can access all files)
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = user_id_param
  LIMIT 1;
  
  IF user_role IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;

  -- Check if user owns the file (file is in their folder)
  -- Format: {user_id}/timestamp_filename
  IF (storage.foldername(storage_path))[1] = user_id_param::text THEN
    RETURN TRUE;
  END IF;

  -- Check if user has permission via file_permissions
  -- This includes 'read', 'write', and 'admin' permissions
  -- Match by storage_key (which should equal the storage path exactly)
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
  -- If user has read/write/admin permission on folder, they can access files in it
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
GRANT EXECUTE ON FUNCTION public.user_has_file_access_by_path(TEXT, UUID) TO anon;

DO $$ BEGIN
  RAISE NOTICE '✅ Helper function created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ This function supports:';
  RAISE NOTICE '   - Admin/Owner role (can access ALL files)';
  RAISE NOTICE '   - READ permissions for file previews';
  RAISE NOTICE '   - File ownership';
  RAISE NOTICE '   - Inherited folder permissions';
  RAISE NOTICE '   - Share relationships (shared_by AND shared_with)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: You need to set up Storage Policies via Supabase Dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Go to Supabase Dashboard → Storage → Policies';
  RAISE NOTICE '2. Select the "files" bucket';
  RAISE NOTICE '3. Delete any existing SELECT policies that might conflict';
  RAISE NOTICE '4. Click "New Policy" → "For full customization"';
  RAISE NOTICE '5. Use the policy SQL provided below';
  RAISE NOTICE '';
  RAISE NOTICE 'Or use the Supabase CLI with service role key';
END $$;

-- ============================================================
-- STORAGE POLICY SQL (Copy this to Supabase Dashboard)
-- ============================================================
-- 
-- This policy allows users to PREVIEW files if they have:
-- 1. Admin/Owner role (can access ALL files), OR
-- 2. Ownership (file in their folder), OR
-- 3. READ permission via file_permissions, OR
-- 4. READ permission via folder_permissions (inherited), OR
-- 5. Share relationship (shared_by OR shared_with)
-- 
-- Policy Name: "Users can view accessible files"
-- Policy Type: SELECT (allows reading/downloading files)
-- Target Roles: authenticated
-- 
-- USING expression:
-- 
-- bucket_id = 'files' AND (
--   (storage.foldername(name))[1] = auth.uid()::text
--   OR
--   public.user_has_file_access_by_path(name, auth.uid())
-- )
-- 
-- IMPORTANT: This policy includes READ permissions, so users with
-- read-only access can preview files!
-- 
-- ============================================================

-- Alternative: If you have Supabase CLI access, use this command:
-- supabase storage policy create --bucket files --name "Users can view accessible files" --select "bucket_id = 'files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.user_has_file_access_by_path(name, auth.uid()))"
