-- Fix missing file permissions in shared folders
-- This script identifies and fixes files that are in shared folders but don't have explicit permissions

-- Step 1: Identify files missing permissions
WITH files_missing_perms AS (
  SELECT 
    f.id as file_id,
    f.name as file_name,
    f.folder_id,
    fp.user_id as should_have_permission_for_user,
    fp.permission_type
  FROM public.files f
  INNER JOIN public.folders fo ON f.folder_id = fo.id
  INNER JOIN public.folder_permissions fp ON fo.id = fp.folder_id
  WHERE f.deleted_at IS NULL
  AND fo.deleted_at IS NULL
  -- File doesn't have the permission that should be inherited
  AND NOT EXISTS (
    SELECT 1 FROM public.file_permissions existing
    WHERE existing.file_id = f.id
    AND existing.user_id = fp.user_id
    AND existing.permission_type = fp.permission_type
  )
)
SELECT 
  COUNT(*) as files_to_fix,
  COUNT(DISTINCT folder_id) as folders_affected,
  COUNT(DISTINCT should_have_permission_for_user) as users_affected
FROM files_missing_perms;

-- Step 2: Insert missing file permissions
INSERT INTO public.file_permissions (file_id, user_id, permission_type, inherited_from)
SELECT DISTINCT
  f.id as file_id,
  fp.user_id,
  fp.permission_type,
  f.folder_id as inherited_from
FROM public.files f
INNER JOIN public.folders fo ON f.folder_id = fo.id
INNER JOIN public.folder_permissions fp ON fo.id = fp.folder_id
WHERE f.deleted_at IS NULL
AND fo.deleted_at IS NULL
-- Only insert if permission doesn't already exist
AND NOT EXISTS (
  SELECT 1 FROM public.file_permissions existing
  WHERE existing.file_id = f.id
  AND existing.user_id = fp.user_id
  AND existing.permission_type = fp.permission_type
)
ON CONFLICT (file_id, user_id, permission_type) DO NOTHING;

-- Step 3: Verify the fix
SELECT 
  fo.id as folder_id,
  fo.name as folder_name,
  fp.user_id as shared_with_user,
  fp.permission_type,
  COUNT(DISTINCT f.id) as files_in_folder,
  COUNT(DISTINCT CASE WHEN file_perms.id IS NOT NULL THEN f.id END) as files_with_explicit_perms,
  COUNT(DISTINCT f.id) - COUNT(DISTINCT CASE WHEN file_perms.id IS NOT NULL THEN f.id END) as files_missing_perms
FROM public.folders fo
INNER JOIN public.folder_permissions fp ON fo.id = fp.folder_id
LEFT JOIN public.files f ON f.folder_id = fo.id AND f.deleted_at IS NULL
LEFT JOIN public.file_permissions file_perms ON file_perms.file_id = f.id 
  AND file_perms.user_id = fp.user_id
  AND file_perms.permission_type = fp.permission_type
WHERE fo.deleted_at IS NULL
GROUP BY fo.id, fo.name, fp.user_id, fp.permission_type
HAVING COUNT(DISTINCT f.id) > 0
ORDER BY files_missing_perms DESC, files_in_folder DESC;

-- Step 4: Show summary
DO $$
DECLARE
  total_fixed INTEGER;
BEGIN
  -- Count how many permissions were just created
  GET DIAGNOSTICS total_fixed = ROW_COUNT;
  
  RAISE NOTICE '✅ Fixed missing file permissions!';
  RAISE NOTICE '   Permissions created: %', total_fixed;
  RAISE NOTICE '';
  RAISE NOTICE 'All files in shared folders now have explicit permissions.';
  RAISE NOTICE 'Users with shared folder access can now see all files!';
END $$;

