-- Complete fix for RLS policies - DELETE/UPDATE for files and folders
-- This fixes the "new row violates row-level security policy" error
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

-- ============================================
-- STEP 2: Create simple, working UPDATE policies for owners
-- ============================================
-- These policies allow owners to update (soft delete) their own files/folders
-- The WITH CHECK clause must match the USING clause for simple cases

CREATE POLICY "Owners can update their folders" ON public.folders
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their files" ON public.files
  FOR UPDATE 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- STEP 3: Verify the policies were created
-- ============================================
-- You can check with:
-- SELECT * FROM pg_policies WHERE tablename IN ('folders', 'files') AND policyname LIKE '%update%';

-- ============================================
-- STEP 4: Test query (optional - run this to verify)
-- ============================================
-- This should return your user ID if you're logged in:
-- SELECT auth.uid() as current_user_id;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Soft delete (UPDATE deleted_at) requires UPDATE permission
-- 2. The WITH CHECK clause ensures the updated row still meets the policy
-- 3. For owners, we only check owner_id, which doesn't change during soft delete
-- 4. If you need to allow users with write permission to delete shared files,
--    add additional policies (but test the owner policy first)

