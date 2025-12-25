# Fix for Internal Sharing Not Showing Files

## Problem
When you share a file internally with a user (e.g., `test@deckstore.com`), the shared file doesn't appear in their "Shared" page.

## Root Causes
1. **RLS Policies**: The Row Level Security policies on `file_permissions` and `folder_permissions` tables were too restrictive - users couldn't see their own permission records.
2. **Permission Creation**: When sharing, permission records might not be created due to RLS blocking the insert.

## Solution

### Step 1: Fix RLS Policies
Run the SQL script to update the RLS policies:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open and run: `supabase/fix_permission_rls.sql`

This will:
- Allow users to view their own permissions (`user_id = auth.uid()`)
- Allow file/folder owners to create permissions for other users when sharing

### Step 2: Fix Existing Shares (if any)
If you have existing shares that were created before the fix, you need to manually create permission records for them.

**Option A: Re-share the files**
- The easiest solution is to delete the old share and create a new one
- The new share will automatically create the permission record

**Option B: Use the fix function**
1. Run `supabase/fix_existing_shares.sql` in SQL Editor (this creates a helper function)
2. For each share that's missing permissions, run:
   ```sql
   SELECT fix_share_permissions('share-id-here', 'target-user-id-here');
   ```

### Step 3: Test the Fix
1. **Share a file** with `test@deckstore.com`:
   - Go to Files page
   - Click the "..." menu on a file
   - Select "Share"
   - Choose "Internal" tab
   - Enter `test@deckstore.com`
   - Select access level (View/Download/Edit)
   - Click "Share"

2. **Log in as test@deckstore.com**:
   - Go to the "Shared" page
   - You should now see the shared file

3. **Check the console** (F12 → Console):
   - You should see logs like:
     - "File permissions found: 1"
     - "Shares found: 1"
   - If you see errors, check the error messages

## Debugging

If files still don't appear:

1. **Check Browser Console** (F12):
   - Look for errors in the console
   - Check the network tab for failed API calls

2. **Check Supabase Dashboard**:
   - Go to **Table Editor** → `file_permissions`
   - Filter by `user_id` = your user ID
   - Verify permission records exist
   
   - Go to **Table Editor** → `shares`
   - Check if share records exist with `share_type = 'internal'`

3. **Verify RLS Policies**:
   - Go to **Authentication** → **Policies**
   - Check that policies allow:
     - Users to SELECT their own permissions
     - File/folder owners to INSERT permissions for others

4. **Check User Email**:
   - Make sure the email you're sharing with matches exactly (case-insensitive)
   - The email lookup is case-insensitive, but verify in the `profiles` table

## Common Issues

### Issue: "User not found" error when sharing
**Solution**: Make sure the user exists in the `profiles` table. If not, they need to sign up first.

### Issue: Permission records not created
**Solution**: 
- Check RLS policies allow owners to insert permissions
- Check browser console for errors
- Verify the target user ID was resolved correctly

### Issue: Files appear but can't be opened
**Solution**: This is a different issue - check file access permissions and RLS policies on the `files` table.

## Verification Queries

Run these in Supabase SQL Editor to verify everything is set up correctly:

```sql
-- Check if you have any permissions
SELECT * FROM file_permissions WHERE user_id = auth.uid();
SELECT * FROM folder_permissions WHERE user_id = auth.uid();

-- Check if you have any shares
SELECT * FROM shares WHERE share_type = 'internal';

-- Check if a specific user exists
SELECT id, email, full_name FROM profiles WHERE email = 'test@deckstore.com';
```

