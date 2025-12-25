-- Fix RLS policies for shares table
-- Allow users to see shares for resources they have permissions on

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view shares they created or have access to" ON public.shares;

-- Create a new policy that allows users to:
-- 1. View shares they created
-- 2. View shares for files/folders they have permissions on (via permission tables)
CREATE POLICY "Users can view relevant shares" ON public.shares
  FOR SELECT USING (
    -- User created the share
    shared_by = auth.uid() OR
    -- User has permission on the file
    (resource_type = 'file' AND EXISTS (
      SELECT 1 FROM public.file_permissions
      WHERE file_id = shares.resource_id
      AND user_id = auth.uid()
    )) OR
    -- User has permission on the folder
    (resource_type = 'folder' AND EXISTS (
      SELECT 1 FROM public.folder_permissions
      WHERE folder_id = shares.resource_id
      AND user_id = auth.uid()
    ))
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Shares RLS policy updated successfully!';
END $$;

