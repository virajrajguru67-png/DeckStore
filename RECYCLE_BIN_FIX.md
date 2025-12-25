# Fix for Recycle Bin Not Showing Deleted Files

## Problem
When you delete files or folders, they don't appear in the Recycle Bin.

## Root Causes
1. **RLS Policies**: The SELECT policies for files and folders only allow viewing items where `deleted_at IS NULL`, so deleted items are hidden
2. **Query Filtering**: The `getDeletedFiles` and `getDeletedFolders` functions weren't filtering by owner or date range
3. **Cache Not Refreshing**: The Recycle Bin queries weren't being invalidated after deletion

## Solution

### Step 1: Fix RLS Policies (IMPORTANT!)
Run the SQL script to allow viewing deleted files/folders:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run: `supabase/fix_recycle_bin_rls.sql`

This creates policies that allow users to view their own deleted files and folders.

### Step 2: Code is Already Updated
The following have been fixed:

1. **`fileService.ts`**:
   - `getDeletedFiles()` now filters by:
     - Current user's files only (`owner_id = auth.uid()`)
     - Files deleted in last 30 days (`deleted_at >= 30 days ago`)
   - `getDeletedFolders()` now filters by:
     - Current user's folders only (`owner_id = auth.uid()`)
     - Folders deleted in last 30 days (`deleted_at >= 30 days ago`)

2. **`Files.tsx`**:
   - After deleting, it now invalidates Recycle Bin queries
   - This ensures the Recycle Bin refreshes immediately

### Step 3: Test
1. **Delete a file or folder** you own
2. **Go to Recycle Bin** page
3. **You should see the deleted item** with:
   - File/folder name
   - Size (for files)
   - "Deleted X ago" timestamp
   - Restore button
   - Delete permanently button (for files)

## How It Works

### Before:
- RLS policies blocked viewing deleted items
- Queries didn't filter by owner or date
- Recycle Bin didn't refresh after deletion

### After:
- RLS policies allow viewing own deleted items
- Queries filter by owner and last 30 days
- Recycle Bin refreshes automatically after deletion

## 30-Day Retention

Files and folders are automatically filtered to show only items deleted in the last 30 days. Items older than 30 days won't appear in the Recycle Bin, but they're still in the database (not permanently deleted).

To permanently delete old items, you can create a scheduled job or manual cleanup script.

## Verification

After running the SQL fix, verify it works:

1. **Delete a file** you own
2. **Check Recycle Bin** - it should appear
3. **Check browser console** - no errors should appear
4. **Try restoring** - it should work

## Troubleshooting

**If deleted files still don't appear:**

1. **Check RLS Policies:**
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('files', 'folders')
   AND qual LIKE '%deleted_at%';
   ```
   You should see policies for viewing deleted items.

2. **Check if file was actually deleted:**
   ```sql
   SELECT id, name, owner_id, deleted_at
   FROM files
   WHERE owner_id = auth.uid()
   AND deleted_at IS NOT NULL
   ORDER BY deleted_at DESC
   LIMIT 5;
   ```

3. **Check browser console** for errors when loading Recycle Bin

4. **Verify your user ID:**
   ```sql
   SELECT auth.uid() as my_user_id;
   ```

## Files Updated

1. `supabase/fix_recycle_bin_rls.sql` - RLS policies for viewing deleted items
2. `deck-store/src/services/fileService.ts` - Updated getDeletedFiles/getDeletedFolders
3. `deck-store/src/pages/Files.tsx` - Added query invalidation after delete
4. `RECYCLE_BIN_FIX.md` - This guide

