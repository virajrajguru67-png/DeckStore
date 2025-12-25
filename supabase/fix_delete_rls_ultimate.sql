-- ULTIMATE FIX for RLS delete error
-- This uses a more permissive approach that should definitely work
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing UPDATE policies
-- ============================================
-- Drop all possible policy names
DROP POLICY IF EXISTS "Users can update folders they own or have write permission" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own or have write permission" ON public.files;
DROP POLICY IF EXISTS "Users can update folders they own" ON public.folders;
DROP POLICY IF EXISTS "Users can update files they own" ON public.files;
DROP POLICY IF EXISTS "Users with write permission can update folders" ON public.folders;
DROP POLICY IF EXISTS "Users with write permission can update files" ON public.files;
DROP POLICY IF EXISTS "Owners can update their folders" ON public.folders;
DROP POLICY IF EXISTS "Owners can update their files" ON public.files;
DROP POLICY IF EXISTS "folders_owner_update" ON public.folders;
DROP POLICY IF EXISTS "files_owner_update" ON public.files;

-- ============================================
-- STEP 2: Check current policies (for debugging)
-- ============================================
-- Uncomment to see what policies exist:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('folders', 'files') AND cmd = 'UPDATE';

-- ============================================
-- STEP 3: Create the simplest possible policies
-- ============================================
-- These policies are as simple as possible - just check ownership
-- No function calls, no complex logic

-- For folders: Allow update if user is the owner
CREATE POLICY "folders_update_owner" ON public.folders
  FOR UPDATE 
  USING (
    -- Check ownership on existing row
    owner_id = auth.uid()
  )
  WITH CHECK (
    -- Check ownership on new row (should be same since we only update deleted_at)
    owner_id = auth.uid()
  );

-- For files: Allow update if user is the owner  
CREATE POLICY "files_update_owner" ON public.files
  FOR UPDATE 
  USING (
    -- Check ownership on existing row
    owner_id = auth.uid()
  )
  WITH CHECK (
    -- Check ownership on new row (should be same since we only update deleted_at)
    owner_id = auth.uid()
  );

-- ============================================
-- STEP 4: Verify RLS is enabled
-- ============================================
-- Make sure RLS is enabled (it should be, but let's be sure)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  - folders_update_owner (UPDATE)';
  RAISE NOTICE '  - files_update_owner (UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser';
  RAISE NOTICE '2. Try deleting a file/folder you own';
  RAISE NOTICE '3. Check browser console if it still fails';
END $$;

-- ============================================
-- STEP 6: Diagnostic queries (run these if still failing)
-- ============================================
-- Uncomment and run these to diagnose:

-- Check your user ID:
-- SELECT auth.uid() as my_user_id;

-- Check if you can see your folders:
-- SELECT id, name, owner_id, deleted_at 
-- FROM folders 
-- WHERE owner_id = auth.uid()
-- LIMIT 5;

-- Check if you can see your files:
-- SELECT id, name, owner_id, deleted_at 
-- FROM files 
-- WHERE owner_id = auth.uid()
-- LIMIT 5;

-- Check all UPDATE policies:
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('folders', 'files') AND cmd = 'UPDATE';

