-- Fix RLS policies for file_permissions and folder_permissions
-- Users should be able to view permissions assigned to them

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view permissions for accessible folders" ON public.folder_permissions;
DROP POLICY IF EXISTS "Users can view permissions for accessible files" ON public.file_permissions;

-- Create new policies that allow users to see their own permissions
CREATE POLICY "Users can view their own permissions" ON public.folder_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own permissions" ON public.file_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Allow file/folder owners to manage permissions (create, update, delete)
-- This allows owners to share files/folders with other users
DROP POLICY IF EXISTS "Owners and admins can manage folder permissions" ON public.folder_permissions;
DROP POLICY IF EXISTS "Owners and admins can manage file permissions" ON public.file_permissions;

CREATE POLICY "Owners can manage folder permissions" ON public.folder_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE id = folder_permissions.folder_id
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE id = folder_permissions.folder_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage file permissions" ON public.file_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_permissions.file_id
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE id = file_permissions.file_id
      AND owner_id = auth.uid()
    )
  );

