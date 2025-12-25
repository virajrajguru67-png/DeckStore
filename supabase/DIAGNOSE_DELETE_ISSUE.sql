-- Diagnostic script to check why delete is failing
-- Run this to see what's happening with RLS policies

-- 1. Check your current user ID
SELECT 
    'Current User ID' as check_type,
    auth.uid()::text as value;

-- 2. Check if RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    tablename,
    rowsecurity::text as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('folders', 'files');

-- 3. List ALL UPDATE policies on folders and files
SELECT 
    'UPDATE Policies' as check_type,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename IN ('folders', 'files') 
AND cmd = 'UPDATE'
ORDER BY tablename, policyname;

-- 4. Check if you can SELECT your own folders
SELECT 
    'Can Select Own Folders' as check_type,
    COUNT(*)::text as folder_count
FROM folders 
WHERE owner_id = auth.uid()
AND deleted_at IS NULL;

-- 5. Check if you can SELECT your own files
SELECT 
    'Can Select Own Files' as check_type,
    COUNT(*)::text as file_count
FROM files 
WHERE owner_id = auth.uid()
AND deleted_at IS NULL;

-- 6. Try to see a specific folder (replace with actual folder ID)
-- SELECT id, name, owner_id, deleted_at 
-- FROM folders 
-- WHERE id = 'YOUR_FOLDER_ID_HERE';

-- 7. Check all policies on folders table
SELECT 
    'All Folder Policies' as check_type,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'folders'
ORDER BY cmd, policyname;

-- 8. Check all policies on files table
SELECT 
    'All File Policies' as check_type,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'files'
ORDER BY cmd, policyname;

