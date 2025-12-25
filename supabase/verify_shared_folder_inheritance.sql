-- Verify and fix shared folder permission inheritance
-- This script ensures files/folders in shared folders are visible to recipients

-- First, ensure the auto-inherit trigger exists (run auto_inherit_shared_folder_permissions.sql first)
-- This script verifies the setup and provides diagnostics

-- Check if files in shared folders are accessible via RLS
-- This query should return files that are in folders with permissions
DO $$
DECLARE
  test_folder_id UUID;
  test_user_id UUID;
  file_count INTEGER;
BEGIN
  -- Find a shared folder with permissions
  SELECT fp.folder_id, fp.user_id INTO test_folder_id, test_user_id
  FROM public.folder_permissions fp
  LIMIT 1;
  
  IF test_folder_id IS NOT NULL THEN
    RAISE NOTICE 'Testing folder: %, User: %', test_folder_id, test_user_id;
    
    -- Count files in this folder
    SELECT COUNT(*) INTO file_count
    FROM public.files
    WHERE folder_id = test_folder_id
    AND deleted_at IS NULL;
    
    RAISE NOTICE 'Files in folder: %', file_count;
    
    -- Check if user can see files via RLS (this simulates what the RLS policy does)
    SELECT COUNT(*) INTO file_count
    FROM public.files f
    WHERE f.folder_id = test_folder_id
    AND f.deleted_at IS NULL
    AND (
      f.owner_id = test_user_id
      OR EXISTS (
        SELECT 1 FROM public.file_permissions fp
        WHERE fp.file_id = f.id
        AND fp.user_id = test_user_id
        AND fp.permission_type = 'read'
      )
      OR EXISTS (
        SELECT 1 FROM public.folders fo
        INNER JOIN public.folder_permissions fop ON fo.id = fop.folder_id
        WHERE fo.id = f.folder_id
        AND fop.user_id = test_user_id
        AND fop.permission_type = 'read'
      )
    );
    
    RAISE NOTICE 'Files visible to user via RLS: %', file_count;
  ELSE
    RAISE NOTICE 'No shared folders found for testing';
  END IF;
END $$;

-- Verify the has_file_permission function works correctly
-- This should return TRUE for files in shared folders
SELECT 
  f.id as file_id,
  f.name as file_name,
  f.folder_id,
  fp.user_id,
  has_file_permission(f.id, fp.user_id, 'read'::permission_type) as can_read
FROM public.files f
INNER JOIN public.folders fo ON f.folder_id = fo.id
INNER JOIN public.folder_permissions fp ON fo.id = fp.folder_id
WHERE f.deleted_at IS NULL
AND fo.deleted_at IS NULL
LIMIT 10;

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'inherit_permissions_on_folder_create',
  'inherit_permissions_on_file_create'
);

DO $$ BEGIN
  RAISE NOTICE '✅ Inheritance verification complete!';
  RAISE NOTICE 'If files are not visible, check:';
  RAISE NOTICE '1. Run auto_inherit_shared_folder_permissions.sql to create triggers';
  RAISE NOTICE '2. Verify folder_permissions exist for the shared folder';
  RAISE NOTICE '3. Check RLS policies are enabled';
END $$;

