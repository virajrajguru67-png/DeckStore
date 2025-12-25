# Fix: Infinite Recursion in RLS Policies

## Problem
Error: `infinite recursion detected in policy for relation "user_roles"`

This error occurs when RLS policies query the same table they're protecting, creating an infinite loop.

## Root Cause
Several RLS policies were checking if a user is an admin by directly querying the `user_roles` table:

```sql
-- This causes infinite recursion:
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles  -- ❌ Querying the same table!
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
```

When PostgreSQL tries to evaluate this policy:
1. It needs to check if the user is an admin
2. To check admin status, it queries `user_roles`
3. This triggers the same policy check again
4. Infinite loop! 🔄

## Solution
Create a `SECURITY DEFINER` function that bypasses RLS to check admin status, then use that function in all policies.

### The Fix Function
```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS!
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'owner')
  );
END;
$$;
```

### Updated Policies
All policies now use the function instead of directly querying `user_roles`:

```sql
-- ✅ No recursion - uses the function
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    public.is_admin_or_owner(auth.uid())  -- ✅ Uses function
  )
```

## Affected Policies
The following policies were fixed:
1. ✅ `user_roles` - "Admins can manage roles"
2. ✅ `storage_quotas` - "Admins can view all quotas"
3. ✅ `activity_logs` - "Admins can view all activity logs"
4. ✅ `share_access_logs` - "Share creators can view access logs"
5. ✅ `metadata_tags` - "Admins can delete tags"

## How to Apply

### Step 1: Run the SQL Fix
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/fix_user_roles_rls_recursion.sql`
3. Execute the script

### Step 2: Verify the Fix
1. Refresh your application
2. Check the browser console - the error should be gone
3. Storage quota should now load correctly

## How It Works

1. **SECURITY DEFINER Function**:
   - Runs with the privileges of the function owner (not the caller)
   - Bypasses RLS when querying `user_roles`
   - Prevents infinite recursion

2. **Policy Evaluation**:
   - When a policy needs to check admin status, it calls `is_admin_or_owner()`
   - The function queries `user_roles` without triggering RLS
   - Returns `true` or `false` without recursion

3. **Performance**:
   - Function is cached by PostgreSQL
   - Minimal performance impact
   - Much faster than infinite loops! 😄

## Testing

After applying the fix, verify:

1. **Storage Quota Loads**:
   - Navigate to any page that shows storage quota
   - Should load without errors

2. **Admin Functions Work**:
   - If you're an admin, verify you can:
     - View all quotas
     - View all activity logs
     - Manage user roles
     - Delete tags

3. **No Console Errors**:
   - Open browser DevTools (F12)
   - Check Console tab
   - Should see no RLS recursion errors

## Files Changed

- `supabase/fix_user_roles_rls_recursion.sql` - Complete fix for all recursive policies
- `RLS_RECURSION_FIX.md` - This documentation

## Additional Notes

- The `SECURITY DEFINER` function is safe because it only checks admin status
- All policies now use this function consistently
- Future policies should also use `is_admin_or_owner()` instead of directly querying `user_roles`

