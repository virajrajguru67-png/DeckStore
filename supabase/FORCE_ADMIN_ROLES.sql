-- SQL dialect: PostgreSQL
-- Assign Admin/Owner roles by EMAIL
-- Run this in the Supabase SQL Editor to fix your accounts

-- 1. First, ensure the users have roles in the user_roles table
-- 2. Then, update them to the correct role

DO $$
BEGIN
  -- Assign 'owner' to viraj@deckstore.com (if it exists)
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'owner'::app_role 
  FROM auth.users 
  WHERE email = 'viraj@deckstore.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'owner';

  -- Assign 'admin' to admin@deckstore.com
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::app_role 
  FROM auth.users 
  WHERE email = 'admin@deckstore.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RAISE NOTICE 'Admin roles assigned to specific emails.';
END $$;
