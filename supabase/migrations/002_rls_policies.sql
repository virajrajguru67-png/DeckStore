-- Row Level Security (RLS) policies for Deck Store

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has permission
CREATE OR REPLACE FUNCTION has_folder_permission(
  folder_id_param UUID,
  user_id_param UUID,
  permission_type_param permission_type
) RETURNS BOOLEAN AS $$
BEGIN
  -- Owner always has all permissions
  IF EXISTS (
    SELECT 1 FROM public.folders 
    WHERE id = folder_id_param AND owner_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check direct permissions
  IF EXISTS (
    SELECT 1 FROM public.folder_permissions
    WHERE folder_id = folder_id_param 
    AND user_id = user_id_param
    AND permission_type = permission_type_param
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check inherited permissions from parent folders (recursive)
  IF EXISTS (
    WITH RECURSIVE folder_tree AS (
      SELECT id, parent_folder_id FROM public.folders WHERE id = folder_id_param
      UNION ALL
      SELECT f.id, f.parent_folder_id
      FROM public.folders f
      INNER JOIN folder_tree ft ON f.id = ft.parent_folder_id
    )
    SELECT 1 FROM public.folder_permissions fp
    INNER JOIN folder_tree ft ON fp.folder_id = ft.id
    WHERE fp.user_id = user_id_param
    AND fp.permission_type = permission_type_param
    LIMIT 1
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check file permissions
CREATE OR REPLACE FUNCTION has_file_permission(
  file_id_param UUID,
  user_id_param UUID,
  permission_type_param permission_type
) RETURNS BOOLEAN AS $$
DECLARE
  file_folder_id UUID;
BEGIN
  -- Owner always has all permissions
  IF EXISTS (
    SELECT 1 FROM public.files 
    WHERE id = file_id_param AND owner_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check direct file permissions
  IF EXISTS (
    SELECT 1 FROM public.file_permissions
    WHERE file_id = file_id_param 
    AND user_id = user_id_param
    AND permission_type = permission_type_param
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check folder permissions (inherited)
  SELECT folder_id INTO file_folder_id FROM public.files WHERE id = file_id_param;
  
  IF file_folder_id IS NOT NULL THEN
    RETURN has_folder_permission(file_folder_id, user_id_param, permission_type_param);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Folders policies
DROP POLICY IF EXISTS "Users can view folders they have access to" ON public.folders;
CREATE POLICY "Users can view folders they have access to" ON public.folders
  FOR SELECT USING (
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      has_folder_permission(id, auth.uid(), 'read')
    )
  );

DROP POLICY IF EXISTS "Users can create folders" ON public.folders;
CREATE POLICY "Users can create folders" ON public.folders
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update folders they own or have write permission" ON public.folders;
CREATE POLICY "Users can update folders they own or have write permission" ON public.folders
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    has_folder_permission(id, auth.uid(), 'write')
  );

DROP POLICY IF EXISTS "Users can delete folders they own or have delete permission" ON public.folders;
CREATE POLICY "Users can delete folders they own or have delete permission" ON public.folders
  FOR DELETE USING (
    owner_id = auth.uid() OR
    has_folder_permission(id, auth.uid(), 'delete')
  );

-- Files policies
DROP POLICY IF EXISTS "Users can view files they have access to" ON public.files;
CREATE POLICY "Users can view files they have access to" ON public.files
  FOR SELECT USING (
    deleted_at IS NULL AND (
      owner_id = auth.uid() OR
      has_file_permission(id, auth.uid(), 'read')
    )
  );

DROP POLICY IF EXISTS "Users can create files" ON public.files;
CREATE POLICY "Users can create files" ON public.files
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update files they own or have write permission" ON public.files;
CREATE POLICY "Users can update files they own or have write permission" ON public.files
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    has_file_permission(id, auth.uid(), 'write')
  );

DROP POLICY IF EXISTS "Users can delete files they own or have delete permission" ON public.files;
CREATE POLICY "Users can delete files they own or have delete permission" ON public.files
  FOR DELETE USING (
    owner_id = auth.uid() OR
    has_file_permission(id, auth.uid(), 'delete')
  );

-- File versions policies
DROP POLICY IF EXISTS "Users can view file versions for accessible files" ON public.file_versions;
CREATE POLICY "Users can view file versions for accessible files" ON public.file_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_versions.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'read'))
    )
  );

DROP POLICY IF EXISTS "Users can create file versions for accessible files" ON public.file_versions;
CREATE POLICY "Users can create file versions for accessible files" ON public.file_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_versions.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'write'))
    )
  );

-- Folder permissions policies
DROP POLICY IF EXISTS "Users can view permissions for accessible folders" ON public.folder_permissions;
CREATE POLICY "Users can view permissions for accessible folders" ON public.folder_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE id = folder_permissions.folder_id
      AND (owner_id = auth.uid() OR has_folder_permission(folder_id, auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Owners and admins can manage folder permissions" ON public.folder_permissions;
CREATE POLICY "Owners and admins can manage folder permissions" ON public.folder_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE id = folder_permissions.folder_id
      AND (owner_id = auth.uid() OR has_folder_permission(folder_id, auth.uid(), 'admin'))
    )
  );

-- File permissions policies
DROP POLICY IF EXISTS "Users can view permissions for accessible files" ON public.file_permissions;
CREATE POLICY "Users can view permissions for accessible files" ON public.file_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_permissions.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Owners and admins can manage file permissions" ON public.file_permissions;
CREATE POLICY "Owners and admins can manage file permissions" ON public.file_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_permissions.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'admin'))
    )
  );

-- Shares policies
DROP POLICY IF EXISTS "Users can view shares they created or have access to" ON public.shares;
CREATE POLICY "Users can view shares they created or have access to" ON public.shares
  FOR SELECT USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.files
      WHERE (resource_type = 'file' AND resource_id = files.id)
      AND (owner_id = auth.uid() OR has_file_permission(files.id, auth.uid(), 'read'))
    ) OR
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE (resource_type = 'folder' AND resource_id = folders.id)
      AND (owner_id = auth.uid() OR has_folder_permission(folders.id, auth.uid(), 'read'))
    )
  );

DROP POLICY IF EXISTS "Users can create shares for resources they own" ON public.shares;
CREATE POLICY "Users can create shares for resources they own" ON public.shares
  FOR INSERT WITH CHECK (
    shared_by = auth.uid() AND (
      (resource_type = 'file' AND EXISTS (
        SELECT 1 FROM public.files WHERE id = resource_id AND owner_id = auth.uid()
      )) OR
      (resource_type = 'folder' AND EXISTS (
        SELECT 1 FROM public.folders WHERE id = resource_id AND owner_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can update their own shares" ON public.shares;
CREATE POLICY "Users can update their own shares" ON public.shares
  FOR UPDATE USING (shared_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shares;
CREATE POLICY "Users can delete their own shares" ON public.shares
  FOR DELETE USING (shared_by = auth.uid());

-- Share access logs policies (admins and share creators)
DROP POLICY IF EXISTS "Share creators can view access logs" ON public.share_access_logs;
CREATE POLICY "Share creators can view access logs" ON public.share_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shares
      WHERE id = share_access_logs.share_id AND shared_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "System can insert share access logs" ON public.share_access_logs;
CREATE POLICY "System can insert share access logs" ON public.share_access_logs
  FOR INSERT WITH CHECK (true);

-- Storage quotas policies
DROP POLICY IF EXISTS "Users can view own quota" ON public.storage_quotas;
CREATE POLICY "Users can view own quota" ON public.storage_quotas
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all quotas" ON public.storage_quotas;
CREATE POLICY "Admins can view all quotas" ON public.storage_quotas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "System can update quotas" ON public.storage_quotas;
CREATE POLICY "System can update quotas" ON public.storage_quotas
  FOR UPDATE USING (true);

-- Activity logs policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- Users can view their own activity logs, admins can view all
DROP POLICY IF EXISTS "Users can view own or admin all logs" ON public.activity_logs;
CREATE POLICY "Users can view own or admin all logs" ON public.activity_logs
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Metadata tags policies
DROP POLICY IF EXISTS "Users can view all tags" ON public.metadata_tags;
CREATE POLICY "Users can view all tags" ON public.metadata_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create tags" ON public.metadata_tags;
CREATE POLICY "Users can create tags" ON public.metadata_tags
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Tag creators can update tags" ON public.metadata_tags;
CREATE POLICY "Tag creators can update tags" ON public.metadata_tags
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete tags" ON public.metadata_tags;
CREATE POLICY "Admins can delete tags" ON public.metadata_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- File tags policies
DROP POLICY IF EXISTS "Users can view file tags for accessible files" ON public.file_tags;
CREATE POLICY "Users can view file tags for accessible files" ON public.file_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_tags.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'read'))
    )
  );

DROP POLICY IF EXISTS "Users can manage file tags for files they can edit" ON public.file_tags;
CREATE POLICY "Users can manage file tags for files they can edit" ON public.file_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_tags.file_id
      AND (owner_id = auth.uid() OR has_file_permission(file_id, auth.uid(), 'write'))
    )
  );
