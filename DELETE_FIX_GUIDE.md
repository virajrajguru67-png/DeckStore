# Fix for Delete Files/Folders Issue

## Problem
When trying to delete files or folders, you get an error: "Failed to delete file" or "Failed to delete folder".

## Root Cause
The RLS (Row Level Security) policies for UPDATE operations on `files` and `folders` tables were missing the `WITH CHECK` clause. In PostgreSQL, UPDATE policies require both:
- `USING` clause: Determines which existing rows can be selected for update
- `WITH CHECK` clause: Determines which rows can be updated (after the update)

Without the `WITH CHECK` clause, the update operation (soft delete) is blocked even if the `USING` clause allows it.

## Solution

### Step 1: Fix RLS Policies (IMPORTANT - Run this first!)
Run the **ultimate** SQL script to fix the RLS policies:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open and run: `supabase/fix_delete_rls_ultimate.sql`

**If that doesn't work, try:**
- `supabase/fix_delete_rls_final.sql` (alternative approach)

This will:
- Drop ALL existing conflicting UPDATE policies
- Create simple, working policies for owners
- Ensure `WITH CHECK` clauses match `USING` clauses
- Allow owners to update (soft delete) their own files/folders

**Why this works:** The complete fix drops all existing policies first, then creates clean, simple policies that only check ownership. This avoids conflicts and permission function issues.

### Step 2: Verify Policies (Optional but Recommended)
Run the verification script to check if policies are set up correctly:

1. In **Supabase SQL Editor**, run: `supabase/VERIFY_RLS_POLICIES.sql`
2. Check the output to ensure:
   - UPDATE policies exist for both `folders` and `files` tables
   - RLS is enabled on both tables
   - Your user ID is returned correctly

### Step 3: Test Delete
1. **Refresh your browser** to ensure you're using the latest code
2. Try deleting a file or folder you own
3. The delete should now work successfully
4. The file/folder will be moved to the Recycle Bin (soft delete)

### Step 4: Diagnose the Issue (If Still Failing)
If delete still doesn't work after running the fix:

1. **Run the diagnostic script:**
   - In Supabase SQL Editor, run: `supabase/DIAGNOSE_DELETE_ISSUE.sql`
   - This will show you:
     - Your current user ID
     - All UPDATE policies
     - Whether RLS is enabled
     - If you can select your own files/folders

2. **Check Browser Console:**
   - Open browser console (F12)
   - Try deleting again
   - Check the console for detailed error logs
   - The improved error logging will show:
     - Your user ID
     - The file/folder ID
     - Full error details

3. **Verify Policies Were Applied:**
   - In Supabase SQL Editor, run:
     ```sql
     SELECT policyname, cmd, qual, with_check
     FROM pg_policies
     WHERE tablename IN ('folders', 'files') AND cmd = 'UPDATE';
     ```
   - You should see policies named `folders_update_owner` and `files_update_owner`

4. **Common Issues:**
   - **Policies not applied:** Make sure you ran the SQL script and it completed without errors
   - **Wrong user ID:** Check that `auth.uid()` returns your user ID
   - **RLS not enabled:** The fix script enables RLS, but verify it's on
   - **Cache issue:** Try refreshing your browser or clearing cache

## What Changed

### Before:
```sql
CREATE POLICY "Users can update files..." ON public.files
  FOR UPDATE USING (owner_id = auth.uid() ...);
  -- Missing WITH CHECK clause!
```

### After:
```sql
CREATE POLICY "Users can update files..." ON public.files
  FOR UPDATE 
  USING (owner_id = auth.uid() ...)
  WITH CHECK (owner_id = auth.uid() ...);
  -- Both clauses present!
```

## Additional Improvements

The delete functions in `fileService.ts` have been improved to:
1. Check if user is logged in
2. Verify file/folder exists before deleting
3. Verify user owns the file/folder before deleting
4. Show more detailed error messages
5. Add extra safety check in the UPDATE query

## Debugging

If delete still doesn't work after running the fix:

1. **Check Browser Console** (F12):
   - Look for detailed error messages
   - Check the network tab for failed API calls

2. **Verify RLS Policies**:
   - Go to **Supabase Dashboard** → **Authentication** → **Policies**
   - Check that UPDATE policies for `files` and `folders` have both `USING` and `WITH CHECK` clauses

3. **Check Ownership**:
   - Verify you own the file/folder you're trying to delete
   - Go to **Table Editor** → `files` or `folders`
   - Check the `owner_id` column matches your user ID

4. **Check Permissions**:
   - If you're not the owner, verify you have 'write' or 'delete' permission
   - Check `file_permissions` or `folder_permissions` tables

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check if you own a specific file
SELECT id, name, owner_id, deleted_at 
FROM files 
WHERE id = 'your-file-id';

-- Check if you own a specific folder
SELECT id, name, owner_id, deleted_at 
FROM folders 
WHERE id = 'your-folder-id';

-- Check your user ID
SELECT auth.uid() as current_user_id;
```

## Notes

- **Soft Delete**: Files and folders are not permanently deleted, they're moved to the Recycle Bin by setting `deleted_at`
- **Hard Delete**: To permanently delete, use the Recycle Bin page
- **Permissions**: Users with 'write' permission can also delete files/folders (soft delete)
- **Owners**: File/folder owners always have full delete permissions

