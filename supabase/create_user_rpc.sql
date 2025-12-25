-- RPC function to create users (requires admin role)
-- This function uses SECURITY DEFINER to bypass RLS and create users
-- Only users with admin or owner role can call this function

CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role app_role DEFAULT 'viewer'::app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id UUID;
  result JSONB;
BEGIN
  -- Check if caller is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Only admins and owners can create users';
  END IF;

  -- Create user in auth.users (this requires direct INSERT)
  -- Note: We can't directly insert into auth.users from a function
  -- So we'll need to use the Supabase Admin API or create a trigger
  -- For now, this function will only create the profile and role
  -- The auth user must be created via Supabase Dashboard or Admin API
  
  -- This is a limitation - we need the user ID first
  -- So we'll return instructions to use the Admin API
  RAISE EXCEPTION 'User creation requires Supabase Admin API. Please use the Add User feature in Supabase Dashboard or create an Edge Function.';
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_with_profile TO authenticated;

COMMENT ON FUNCTION public.create_user_with_profile IS 'Creates a user profile and role. Auth user must be created separately via Admin API.';

