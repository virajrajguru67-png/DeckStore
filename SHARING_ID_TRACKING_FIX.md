# Fix: Direct ID Tracking for Shared Files

## Problem
The `shares` table was missing a `shared_with` column to directly track who the share is intended for (recipient). This made it harder to query "shared with me" efficiently.

## Solution
Added `shared_with` column to directly track the recipient, making queries faster and more reliable.

## Changes Made

### 1. Database Schema Update
- Added `shared_with UUID` column to `shares` table
- Added index for faster queries
- Updated RLS policy to allow direct recipient queries

### 2. Share Service Updates
- `createInternalShare()` now stores `shared_with` when creating shares
- `getSharedWithMe()` now queries directly by `shared_with` (primary method)
- Falls back to permission-based queries for backward compatibility

### 3. Share Interface
- Added `shared_with: string | null` to `Share` interface

## How It Works Now

### When Sharing (createInternalShare):
```typescript
{
  shared_by: "user-who-shared-id",    // ✅ Who shared it
  shared_with: "recipient-user-id",   // ✅ Who it's shared with (NEW!)
  resource_id: "file-or-folder-id",
  resource_type: "file" | "folder",
  access_level: "view" | "download" | "edit"
}
```

### When Viewing "Shared with Me" (getSharedWithMe):
1. **Primary Method**: Query shares where `shared_with = current_user_id`
   - Fast and direct
   - No need to check permissions first

2. **Fallback Method**: Query by permissions (for old shares)
   - Handles shares created before this update
   - Ensures backward compatibility

## How to Apply

### Step 1: Run the Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/add_shared_with_column.sql`
3. Execute the script

### Step 2: Verify the Fix
1. **Test Sharing**:
   - User A shares a file with User B
   - Check browser console - you should see:
     ```
     📤 Creating internal share: {
       sharedBy: "user-a-id",
       sharedWith: "user-b-id",
       ...
     }
     ✅ Share and permission created successfully!
     ```

2. **Test Receiving**:
   - User B logs in and navigates to "Shared" page
   - Check browser console - you should see:
     ```
     getSharedWithMe: Fetching shares for user user-b-id
     Direct shares found (by shared_with): 1
     Total unique shares found: 1
     ```

3. **Verify Database**:
   ```sql
   -- Check that shared_with is populated
   SELECT id, shared_by, shared_with, resource_type, resource_id 
   FROM shares 
   WHERE share_type = 'internal';
   ```

## Benefits

1. **Direct Tracking**: `shared_with` directly identifies the recipient
2. **Faster Queries**: No need to join with permission tables
3. **Better Logging**: Console logs show exactly who shared with whom
4. **Backward Compatible**: Still works with old shares via permissions

## Files Changed

- `supabase/add_shared_with_column.sql` - Database migration
- `src/services/shareService.ts` - Updated to use `shared_with`
- `SHARING_ID_TRACKING_FIX.md` - This documentation

## Console Logging

The service now logs:
- When creating a share: Shows `sharedBy` and `sharedWith` IDs
- When fetching shares: Shows count of direct shares vs fallback shares
- All logs include user IDs for easy debugging

## Example Console Output

**When sharing:**
```
📤 Creating internal share: {
  resourceType: "file",
  resourceId: "abc-123",
  sharedBy: "user-a-uuid",
  sharedWith: "user-b-uuid",
  accessLevel: "view",
  userEmail: "test@deckstore.com",
  targetUserInput: "viraj.rajguru@wpsgp.com"
}
✅ Share and permission created successfully! {
  shareId: "share-uuid",
  sharedBy: "user-a-uuid",
  sharedWith: "user-b-uuid",
  resourceType: "file",
  resourceId: "abc-123"
}
```

**When viewing "Shared with Me":**
```
getSharedWithMe: Fetching shares for user user-b-uuid
Direct shares found (by shared_with): 1
Total unique shares found: 1
  - Direct shares (by shared_with): 1
  - Fallback shares (by permissions): 0
```

