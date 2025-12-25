-- Auto-inherit permissions for files and folders created in shared folders
-- When a file or folder is created in a shared folder, automatically grant
-- the same permissions to all users who have access to the parent folder

-- Function to inherit folder permissions when a new folder is created
CREATE OR REPLACE FUNCTION inherit_folder_permissions_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the new folder has a parent_folder_id, inherit permissions from parent
  IF NEW.parent_folder_id IS NOT NULL THEN
    -- Copy all permissions from parent folder to the new folder
    INSERT INTO public.folder_permissions (
      folder_id,
      user_id,
      permission_type,
      inherited_from
    )
    SELECT
      NEW.id,
      fp.user_id,
      fp.permission_type,
      NEW.parent_folder_id
    FROM public.folder_permissions fp
    WHERE fp.folder_id = NEW.parent_folder_id
    -- Avoid duplicate key errors if permission already exists
    ON CONFLICT (folder_id, user_id, permission_type) DO NOTHING;
    
    RAISE NOTICE 'Inherited % permissions from parent folder % to new folder %', 
      (SELECT COUNT(*) FROM public.folder_permissions WHERE folder_id = NEW.parent_folder_id),
      NEW.parent_folder_id,
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to inherit folder permissions when a new file is created
CREATE OR REPLACE FUNCTION inherit_folder_permissions_on_file_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the new file has a folder_id, inherit permissions from parent folder
  IF NEW.folder_id IS NOT NULL THEN
    -- Copy all permissions from parent folder to the new file
    INSERT INTO public.file_permissions (
      file_id,
      user_id,
      permission_type,
      inherited_from
    )
    SELECT
      NEW.id,
      fp.user_id,
      fp.permission_type,
      NEW.folder_id
    FROM public.folder_permissions fp
    WHERE fp.folder_id = NEW.folder_id
    -- Avoid duplicate key errors if permission already exists
    ON CONFLICT (file_id, user_id, permission_type) DO NOTHING;
    
    RAISE NOTICE 'Inherited % permissions from parent folder % to new file %', 
      (SELECT COUNT(*) FROM public.folder_permissions WHERE folder_id = NEW.folder_id),
      NEW.folder_id,
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS inherit_permissions_on_folder_create ON public.folders;
CREATE TRIGGER inherit_permissions_on_folder_create
  AFTER INSERT ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION inherit_folder_permissions_on_create();

DROP TRIGGER IF EXISTS inherit_permissions_on_file_create ON public.files;
CREATE TRIGGER inherit_permissions_on_file_create
  AFTER INSERT ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION inherit_folder_permissions_on_file_create();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION inherit_folder_permissions_on_create() TO authenticated;
GRANT EXECUTE ON FUNCTION inherit_folder_permissions_on_file_create() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ Auto-inherit permissions triggers created successfully!';
  RAISE NOTICE '✅ New files and folders in shared folders will automatically inherit permissions!';
END $$;

