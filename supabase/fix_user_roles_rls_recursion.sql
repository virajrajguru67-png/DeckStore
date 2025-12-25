-- Fix infinite recursion in user_roles RLS policy
-- The "Admins can manage roles" policy was querying user_roles itself, causing infinite recursion
-- This also fixes the same issue in storage_quotas, activity_logs, share_access_logs, and metadata_tags

-- ============================================
-- PART 1: Create SECURITY DEFINER function to check admin status
-- This bypasses RLS and prevents recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function bypasses RLS, so it can query user_roles without recursion
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'owner')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner(UUID) TO authenticated;

-- ============================================
-- PART 2: Fix user_roles policies
-- ============================================

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create simple SELECT policy - allow all authenticated users to view all roles
-- This is safe because roles are not sensitive information
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy for admins to manage roles using the SECURITY DEFINER function
-- This prevents recursion because the function bypasses RLS
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL 
  TO authenticated
  USING (
    public.is_admin_or_owner(auth.uid())
  )
  WITH CHECK (
    public.is_admin_or_owner(auth.uid())
  );

-- ============================================
-- PART 3: Fix storage_quotas policies
-- ============================================

DROP POLICY IF EXISTS "Admins can view all quotas" ON public.storage_quotas;

CREATE POLICY "Admins can view all quotas" ON public.storage_quotas
  FOR SELECT USING (
    public.is_admin_or_owner(auth.uid())
  );

-- ============================================
-- PART 4: Fix activity_logs policies
-- ============================================

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT USING (
    public.is_admin_or_owner(auth.uid())
  );

-- ============================================
-- PART 5: Fix share_access_logs policies
-- ============================================

DROP POLICY IF EXISTS "Share creators can view access logs" ON public.share_access_logs;

CREATE POLICY "Share creators can view access logs" ON public.share_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shares
      WHERE id = share_access_logs.share_id AND shared_by = auth.uid()
    ) OR
    public.is_admin_or_owner(auth.uid())
  );

-- ============================================
-- PART 6: Fix metadata_tags policies
-- ============================================

DROP POLICY IF EXISTS "Admins can delete tags" ON public.metadata_tags;

CREATE POLICY "Admins can delete tags" ON public.metadata_tags
  FOR DELETE USING (
    public.is_admin_or_owner(auth.uid())
  );

DO $$ BEGIN
  RAISE NOTICE '✅ user_roles RLS recursion fix applied successfully!';
  RAISE NOTICE '✅ Created is_admin_or_owner() function to prevent recursion';
  RAISE NOTICE '✅ Fixed all policies that were causing infinite recursion';
END $$;

