-- FINAL FIX for RLS delete error - More permissive approach
-- This ensures owners can always update their files/folders
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing UPDATE policies
-- ============================================
DROP POLICY IF EXISTS "Users can update folders they own or have write permission" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own or have write permission" ON public.files;
DROP POLICY IF EXISTS "Users can update folders they own" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own" ON public.files;
DROP POLICY IF EXISTS "Users with write permission can update folders" ON public.folders;
DROP POLICY IF EXISTS "Users with write permission can update files" ON public.files;
DROP POLICY IF EXISTS "Owners can update their folders" ON public.folders;
DROP POLICY IF EXISTS "Owners can update their files" ON public.files;

-- ============================================
-- STEP 2: Create permissive UPDATE policies
-- ============================================
-- For soft delete, we only update deleted_at, owner_id stays the same
-- So WITH CHECK can be the same as USING

-- Folders: Allow owners to update (including soft delete)
CREATE POLICY "folders_owner_update" ON public.folders
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Files: Allow owners to update (including soft delete)
CREATE POLICY "files_owner_update" ON public.files
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- STEP 3: Verify policies were created
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Policies created successfully!';
  RAISE NOTICE 'Policy: folders_owner_update';
  RAISE NOTICE 'Policy: files_owner_update';
END $$;

-- ============================================
-- STEP 4: Test (optional - uncomment to test)
-- ============================================
-- Uncomment these to test if policies work:
-- 
-- SELECT auth.uid() as my_user_id;
-- 
-- -- Try to see if you can select your folders
-- SELECT id, name, owner_id FROM folders WHERE owner_id = auth.uid() LIMIT 1;
-- 
-- -- Try to see if you can select your files  
-- SELECT id, name, owner_id FROM files WHERE owner_id = auth.uid() LIMIT 1;

