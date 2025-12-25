-- Fix RLS policies for deleting files and folders
-- The issue is that UPDATE policies need WITH CHECK clause for soft deletes
-- Simplifying by separating owner checks from permission checks

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update folders they own or have write permission" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own or have write permission" ON public.files;
DROP POLICY IF EXISTS "Users can update folders they own" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own" ON public.files;
DROP POLICY IF EXISTS "Users with write permission can update folders" ON public.folders;
DROP POLICY IF EXISTS "Users with write permission can update files" ON public.files;

-- Create simple policy for owners first (this will be checked first)
CREATE POLICY "Users can update folders they own" ON public.folders
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update files they own" ON public.files
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create separate policy for users with write permission (for shared files/folders)
-- This only applies if the user is NOT the owner
CREATE POLICY "Users with write permission can update folders" ON public.folders
  FOR UPDATE 
  USING (
    owner_id != auth.uid() AND
    has_folder_permission(id, auth.uid(), 'write')
  )
  WITH CHECK (
    owner_id != auth.uid() AND
    has_folder_permission(id, auth.uid(), 'write')
  );

CREATE POLICY "Users with write permission can update files" ON public.files
  FOR UPDATE 
  USING (
    owner_id != auth.uid() AND
    has_file_permission(id, auth.uid(), 'write')
  )
  WITH CHECK (
    owner_id != auth.uid() AND
    has_file_permission(id, auth.uid(), 'write')
  );

-- Also ensure DELETE policies allow owners to delete (for hard deletes if needed)
DROP POLICY IF EXISTS "Users can delete folders they own or have delete permission" ON public.folders;
DROP POLICY IF EXISTS "Users can delete files they own or have delete permission" ON public.files;

CREATE POLICY "Users can delete folders they own or have delete permission" ON public.folders
  FOR DELETE USING (
    owner_id = auth.uid() OR
    has_folder_permission(id, auth.uid(), 'delete')
  );

CREATE POLICY "Users can delete files they own or have delete permission" ON public.files
  FOR DELETE USING (
    owner_id = auth.uid() OR
    has_file_permission(id, auth.uid(), 'delete')
  );

-- Note: Soft delete (UPDATE deleted_at) requires UPDATE permission
-- Hard delete (DELETE) requires DELETE permission
-- Owners always have both permissions

