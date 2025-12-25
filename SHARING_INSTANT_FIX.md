# Fix: Instant Sharing - Files Appear Immediately in "Shared with Me"

## Problem
When a file is shared with someone (using email or ID), the recipient should immediately see the file in their "Shared with Me" page, but it wasn't appearing.

## Root Causes
1. **RLS Policy Issue**: The shares table RLS policy was using complex helper functions that might not work correctly in all contexts
2. **Query Syntax Issue**: The `getSharedWithMe()` function was using a complex `.or()` query that wasn't working correctly with PostgREST
3. **Permission Creation**: Permissions needed to be created before shares to ensure proper visibility

## Solution Applied

### 1. Fixed Query Logic (`shareService.ts`)
- Changed `getSharedWithMe()` to use separate queries for files and folders instead of complex `.or()` syntax
- This is more reliable and easier to debug
- Combines results and removes duplicates

### 2. Improved Permission Creation (`shareService.ts`)
- Now creates permissions BEFORE creating the share record
- If permission creation fails, the share is deleted to maintain consistency
- Better error logging to help diagnose issues

### 3. Updated RLS Policy (`fix_shares_rls.sql`)
- Simplified the shares SELECT policy to directly check permission tables
- Allows users to see shares for resources they have permissions on
- More reliable than using helper functions in RLS context

### 4. Auto-Refresh on Shared Page (`Shared.tsx`)
- Added `refetchInterval: 5000` to automatically refresh every 5 seconds
- Added `refetchOnWindowFocus: true` to refresh when user returns to the tab
- This ensures new shares appear quickly even if the page is already open

## Steps to Apply the Fix

### Step 1: Apply the RLS Policy Fix
Run this SQL script in your Supabase SQL Editor:

```sql
-- File: supabase/fix_shares_rls.sql
```

Or copy and paste the contents of `supabase/fix_shares_rls.sql` into the Supabase SQL Editor and execute it.

### Step 2: Verify the Fix
1. **Test Sharing**:
   - Log in as User A (e.g., `test@deckstore.com`)
   - Share a file with User B (e.g., `viraj.rajguru@wpsgp.com`)
   - The share should complete successfully

2. **Test Receiving**:
   - Log in as User B
   - Navigate to "Shared" page
   - The file should appear immediately (or within 5 seconds if the page is already open)

3. **Check Console**:
   - Open browser DevTools (F12)
   - Check the Console tab for any errors
   - You should see logs like:
     - `getSharedWithMe: Fetching permissions for user [userId]`
     - `File permissions found: [count]`
     - `Folder permissions found: [count]`
     - `Total unique shares found: [count]`

## How It Works Now

1. **When User A shares a file with User B**:
   - System resolves User B's email to their UUID
   - Creates a permission record (`file_permissions` or `folder_permissions`) for User B
   - Creates a share record in the `shares` table
   - Both operations must succeed, or the share is rolled back

2. **When User B views "Shared with Me"**:
   - System queries `file_permissions` and `folder_permissions` for User B
   - Gets all file IDs and folder IDs where User B has permissions
   - Queries `shares` table for those resources
   - Displays the shared files/folders

3. **RLS Policy**:
   - Allows users to see shares they created OR
   - Allows users to see shares for resources they have permissions on (via permission tables)

## Troubleshooting

### If shares still don't appear:

1. **Check RLS Policy**:
   ```sql
   -- Verify the policy exists
   SELECT * FROM pg_policies WHERE tablename = 'shares';
   ```

2. **Check Permissions**:
   ```sql
   -- Check if permissions were created
   SELECT * FROM file_permissions WHERE user_id = '[recipient_user_id]';
   SELECT * FROM folder_permissions WHERE user_id = '[recipient_user_id]';
   ```

3. **Check Shares**:
   ```sql
   -- Check if shares exist
   SELECT * FROM shares WHERE resource_id = '[file_or_folder_id]';
   ```

4. **Check User Resolution**:
   - Make sure the email lookup is working
   - Verify the user exists in the `profiles` table
   - Check that the email matches exactly (case-insensitive)

5. **Check Browser Console**:
   - Look for errors in the console
   - Check Network tab for failed API calls
   - Verify the user is authenticated

## Additional Notes

- The Shared page now auto-refreshes every 5 seconds
- Shares appear immediately when the page is opened
- If the page is already open, new shares appear within 5 seconds
- All sharing operations are logged to the console for debugging

## Files Changed

1. `src/services/shareService.ts` - Fixed query logic and permission creation
2. `src/pages/Shared.tsx` - Added auto-refresh
3. `supabase/fix_shares_rls.sql` - New RLS policy for shares table

