-- Script to verify RLS policies are set up correctly
-- Run this after applying fix_delete_rls_complete.sql

-- Check all UPDATE policies on folders table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'folders' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Check all UPDATE policies on files table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'files' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('folders', 'files');

-- Test query to check current user (run while logged in)
SELECT auth.uid() as current_user_id;

-- Check if you can see your own folders
SELECT id, name, owner_id, deleted_at 
FROM folders 
WHERE owner_id = auth.uid()
LIMIT 5;

-- Check if you can see your own files
SELECT id, name, owner_id, deleted_at 
FROM files 
WHERE owner_id = auth.uid()
LIMIT 5;

