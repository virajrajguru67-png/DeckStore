-- Simple fix for RLS policies - allow owners to update their own files/folders
-- This fixes the "new row violates row-level security policy" error

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update folders they own or have write permission" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own or have write permission" ON public.files;

-- Create simpler policies that allow owners to update
-- For soft delete, we only update deleted_at, so owner check is sufficient
CREATE POLICY "Users can update folders they own" ON public.folders
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update files they own" ON public.files
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Also create a policy for users with write permission (for shared files/folders)
CREATE POLICY "Users with write permission can update folders" ON public.folders
  FOR UPDATE 
  USING (
    has_folder_permission(id, auth.uid(), 'write')
    AND owner_id != auth.uid() -- Only if not owner (owner is covered above)
  )
  WITH CHECK (
    has_folder_permission(id, auth.uid(), 'write')
    AND owner_id != auth.uid()
  );

CREATE POLICY "Users with write permission can update files" ON public.files
  FOR UPDATE 
  USING (
    has_file_permission(id, auth.uid(), 'write')
    AND owner_id != auth.uid() -- Only if not owner (owner is covered above)
  )
  WITH CHECK (
    has_file_permission(id, auth.uid(), 'write')
    AND owner_id != auth.uid()
  );

-- Note: The owner policies are checked first, so owners will always be allowed
-- The permission-based policies are for shared files/folders

