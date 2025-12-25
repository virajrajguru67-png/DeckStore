# Final Fix for Delete Issue - Using Database Functions

## Problem
Even though RLS policies look correct, delete operations are still failing with "new row violates row-level security policy".

## Solution: Use Database Functions (Bypasses RLS)

Instead of fighting with RLS policies, we'll use database functions with `SECURITY DEFINER` that bypass RLS and check ownership internally.

### Step 1: Create the Database Functions

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run: `supabase/fix_delete_with_function.sql`

This creates two functions:
- `soft_delete_file(file_id_param UUID)` - Deletes files
- `soft_delete_folder(folder_id_param UUID)` - Deletes folders

These functions:
- Use `SECURITY DEFINER` to bypass RLS
- Check ownership internally before deleting
- Are more reliable than RLS policies

### Step 2: Code is Already Updated

The `fileService.ts` has been updated to:
1. Try using the database function first
2. Fall back to direct update if function doesn't exist (for backward compatibility)

### Step 3: Test

1. **Refresh your browser** to load the updated code
2. Try deleting a file or folder you own
3. It should work now!

## How It Works

**Before (Direct UPDATE - Fails):**
```typescript
await supabase
  .from('files')
  .update({ deleted_at: ... })
  .eq('id', fileId);
// ❌ RLS policy blocks this
```

**After (Using Function - Works):**
```typescript
await supabase.rpc('soft_delete_file', { file_id_param: fileId });
// ✅ Function bypasses RLS, checks ownership internally
```

## Why This Works

1. **SECURITY DEFINER**: The function runs with the privileges of the function owner (not the caller), bypassing RLS
2. **Ownership Check**: The function checks `owner_id = auth.uid()` before updating
3. **No RLS Conflicts**: Since RLS is bypassed, there are no policy conflicts

## Verification

After running the SQL script, verify the functions exist:

```sql
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('soft_delete_file', 'soft_delete_folder');
```

You should see both functions with `security_type = 'DEFINER'`.

## Troubleshooting

**If delete still fails:**

1. **Check if functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name IN ('soft_delete_file', 'soft_delete_folder');
   ```

2. **Check browser console:**
   - Look for error messages
   - Check if it's trying the function or falling back to direct update

3. **Test the function directly:**
   ```sql
   -- Replace with actual file/folder ID
   SELECT soft_delete_file('your-file-id-here');
   SELECT soft_delete_folder('your-folder-id-here');
   ```

## Benefits

✅ **More Reliable**: Bypasses RLS entirely  
✅ **Better Security**: Ownership is checked inside the function  
✅ **Easier to Debug**: Function logic is clear and testable  
✅ **Backward Compatible**: Falls back to direct update if function doesn't exist  

