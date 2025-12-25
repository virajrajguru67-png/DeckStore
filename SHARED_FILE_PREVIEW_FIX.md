# Fix: Shared Files Not Showing in Preview Modal

## Problem
When opening a shared file in the preview modal, users see an error: "Failed to load file. You may not have permission to view this file."

## Root Cause
The Supabase Storage RLS policy was not correctly checking `file_permissions` to allow users with shared access to view files. The policy was trying to match storage paths incorrectly.

## Solution

### 1. Database Fix: Storage RLS Policy
Created a helper function `user_has_file_access_by_path()` that:
- Checks if user owns the file (file is in their folder)
- Checks if user has direct `file_permissions` 
- Checks if user has inherited `folder_permissions`
- Uses `SECURITY DEFINER` to bypass RLS when checking permissions

### 2. Updated Storage Policy
The new policy allows users to view files if:
- They own the file (file is in their folder), OR
- They have permission via `file_permissions` or `folder_permissions`

## How to Apply

### Step 1: Run the SQL Fix
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/fix_storage_shared_files.sql`
3. Execute the script

### Step 2: Verify the Fix
1. **Test Sharing**:
   - User A shares a file with User B
   - Check that permission record is created in `file_permissions`

2. **Test Preview**:
   - User B logs in
   - Navigate to "Shared" page
   - Click on the shared file
   - File should now preview correctly in the modal

3. **Check Console**:
   - Open browser DevTools (F12) → Console
   - You should see:
     ```
     Loading preview for file: { name, storage_key, mime_type }
     Download URL obtained: Success
     ```

## How It Works

### Storage Access Flow
```
User B tries to view shared file
  ↓
Storage RLS policy checks:
  1. Is file in User B's folder? (No)
  2. Does User B have file_permission? (Yes, via share)
  3. Does User B have folder_permission? (Check if applicable)
  ↓
Access granted → Signed URL created → File previews
```

### The Helper Function
```sql
user_has_file_access_by_path(storage_path, user_id)
```
- Takes the storage object path (e.g., `user-a-id/timestamp_filename`)
- Checks if the user has permission via `file_permissions` table
- Returns `TRUE` if user has access, `FALSE` otherwise
- Uses `SECURITY DEFINER` to bypass RLS when checking permissions

## Files Changed

1. **Database**:
   - `supabase/fix_storage_shared_files.sql` - New storage RLS policy

2. **Frontend** (already updated):
   - `src/components/preview/PreviewModal.tsx` - Better error handling
   - `src/pages/Shared.tsx` - Better file fetching
   - `src/services/uploadService.ts` - Better error logging

## Troubleshooting

### If files still don't preview:

1. **Check Permissions**:
   ```sql
   -- Verify permission exists
   SELECT * FROM file_permissions 
   WHERE file_id = '[file_id]' 
   AND user_id = '[recipient_user_id]';
   ```

2. **Check Storage Key**:
   ```sql
   -- Verify file has storage_key
   SELECT id, name, storage_key FROM files 
   WHERE id = '[file_id]';
   ```

3. **Check Console Logs**:
   - Look for "Error creating signed URL" messages
   - Check the storage_key being used
   - Verify the error code and message

4. **Verify Storage Bucket**:
   - Ensure 'files' bucket exists
   - Check bucket is not public (should be `false`)
   - Verify RLS is enabled on the bucket

5. **Test Direct Access**:
   ```sql
   -- Test if function works
   SELECT public.user_has_file_access_by_path(
     '[storage_path]',
     '[user_id]'
   );
   ```

## Additional Notes

- The helper function uses `SECURITY DEFINER` to bypass RLS when checking permissions
- This is safe because it only checks permissions, doesn't modify data
- The function is optimized to check permissions efficiently
- All file access is logged for audit purposes

## Summary

After applying the fix:
- ✅ Users with `file_permissions` can access shared files
- ✅ Storage RLS policy correctly checks permissions
- ✅ Preview modal shows files instead of errors
- ✅ Better error messages and logging for debugging


