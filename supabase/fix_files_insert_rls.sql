-- Fix files INSERT RLS policy to allow uploads to shared folders
-- Users should be able to upload files to folders where they have write permission

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create files" ON public.files;

-- Create new INSERT policy that allows:
-- 1. Users to create files they own (owner_id = auth.uid())
-- 2. Users to create files in folders where they have write permission
CREATE POLICY "Users can create files" ON public.files
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- User owns the file
      owner_id = auth.uid()
      OR
      -- User has write permission on the parent folder
      (
        folder_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.folders
          WHERE id = files.folder_id
          AND deleted_at IS NULL
          AND (
            owner_id = auth.uid()
            OR
            EXISTS (
              SELECT 1 FROM public.folder_permissions
              WHERE folder_id = files.folder_id
              AND user_id = auth.uid()
              AND permission_type IN ('write', 'admin')
            )
          )
        )
      )
    )
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Files INSERT RLS policy updated successfully!';
  RAISE NOTICE '✅ Users can now upload files to shared folders where they have write permission!';
END $$;

