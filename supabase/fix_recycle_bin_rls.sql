-- Fix RLS policies to allow viewing deleted files/folders in Recycle Bin
-- Users should be able to see their own deleted files/folders

-- ============================================
-- STEP 1: Create policy to view deleted folders
-- ============================================
-- Allow users to view their own deleted folders (for Recycle Bin)
CREATE POLICY "Users can view their own deleted folders" ON public.folders
  FOR SELECT USING (
    deleted_at IS NOT NULL AND
    owner_id = auth.uid()
  );

-- ============================================
-- STEP 2: Create policy to view deleted files
-- ============================================
-- Allow users to view their own deleted files (for Recycle Bin)
CREATE POLICY "Users can view their own deleted files" ON public.files
  FOR SELECT USING (
    deleted_at IS NOT NULL AND
    owner_id = auth.uid()
  );

-- ============================================
-- STEP 3: Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Recycle Bin RLS policies created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  - Users can view their own deleted folders';
  RAISE NOTICE '  - Users can view their own deleted files';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now see their deleted files/folders in the Recycle Bin.';
END $$;

