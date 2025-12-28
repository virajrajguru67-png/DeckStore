-- SQL dialect: PostgreSQL
-- Assign admin roles to users based on their names

-- This migration updates the user_roles table based on the names in the profiles table.
-- It uses ILIKE to be case-insensitive and match partial names.

DO $$
BEGIN
  -- 1. Assign 'owner' role to "Viraj" (the developer/owner)
  -- This will find users with "Viraj" in their name and set them as owners.
  UPDATE public.user_roles 
  SET role = 'owner'
  WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE full_name ILIKE '%Viraj%'
  );

  -- 2. Assign 'admin' role to users with "Admin" in their name
  UPDATE public.user_roles 
  SET role = 'admin'
  WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE full_name ILIKE '%Admin%'
    AND id NOT IN (SELECT id FROM public.profiles WHERE full_name ILIKE '%Viraj%') -- Don't overwrite if they are already owner
  );

  -- 3. You can add more assignments here as needed:
  /*
  UPDATE public.user_roles 
  SET role = 'admin'
  WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE full_name ILIKE '%John Doe%'
  );
  */
  
  RAISE NOTICE 'Admin roles assigned based on names.';
END $$;
