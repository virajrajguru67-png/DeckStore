# Storage Policy Setup Guide

## Problem
Files exist in the Supabase Storage bucket but previews don't show because the Storage RLS policy doesn't allow access. **Users with READ permission cannot preview files.**

## Solution

### Step 1: Run the Helper Function SQL
1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `supabase/FIX_STORAGE_PREVIEW.sql`
3. This creates the `user_has_file_access_by_path()` helper function

### Step 2: Create Storage Policy via Dashboard (Recommended)

1. **Go to Storage**: Supabase Dashboard → **Storage** → **Policies**
2. **Select the bucket**: Click on the **"files"** bucket
3. **Create new policy**: Click **"New Policy"** → Select **"For full customization"**
4. **Configure the policy**:
   - **Policy Name**: `Users can view accessible files`
   - **Allowed operation**: `SELECT` (check the box)
   - **Target roles**: `authenticated` (check the box)
   - **USING expression**: Copy and paste the following:

```sql
bucket_id = 'files' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR
  public.user_has_file_access_by_path(name, auth.uid())
)
```

5. **Save the policy**

### Step 3: Verify the Policy

After creating the policy:
1. Open a file preview in your application
2. Check the browser console for any errors
3. The preview should now work

## Alternative: Using Supabase CLI

If you have Supabase CLI access with service role permissions:

```bash
# Make sure you're logged in and linked to your project
supabase link --project-ref your-project-ref

# Create the storage policy
supabase db execute --sql "
CREATE POLICY \"Users can view accessible files\"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    public.user_has_file_access_by_path(name, auth.uid())
  )
);
"
```

## Troubleshooting

### Policy already exists error
If you get an error that the policy already exists:
1. Go to Storage → Policies → files bucket
2. Delete the existing policy with the same name
3. Create the new policy again

### Still not working?
1. **Check file permissions**: Verify that `file_permissions` or `folder_permissions` exist for shared files
2. **Verify storage_key**: Ensure `files.storage_key` matches the actual path in storage
3. **Check console logs**: Look for detailed error messages in the browser console
4. **Test the function**: Run this query to test access:

```sql
-- Replace with actual storage_key and user_id
SELECT 
  f.id,
  f.name,
  f.storage_key,
  public.user_has_file_access_by_path(f.storage_key, auth.uid()) as has_access
FROM public.files f
WHERE f.id = 'your-file-id-here'
LIMIT 1;
```

## How It Works

1. **User owns the file**: If the file is in the user's folder (e.g., `{user_id}/filename`), access is granted
2. **File permissions**: If the user has explicit `file_permissions` for the file, access is granted
3. **Folder permissions**: If the user has `folder_permissions` for the folder containing the file, access is granted

The helper function `user_has_file_access_by_path()` checks all these conditions and returns `TRUE` if the user has access.

