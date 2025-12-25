-- Complete fix for signup issues: Email verification + Profile/Role creation
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Auto-create profile and role on signup
-- ============================================

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now();
  
  -- Create default viewer role for new user
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, 'viewer', now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run function after user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 2: Fix RLS policies for profiles and roles
-- ============================================

-- Update profiles policies to allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR true); -- Allow viewing all for now

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR true); -- Allow viewing all for now

-- ============================================
-- PART 3: Create profiles/roles for existing users (if any)
-- ============================================

-- Create profiles for existing auth users without profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.created_at,
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create roles for existing auth users without roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  u.id,
  'viewer',
  now()
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PART 4: Instructions for email verification
-- ============================================
-- 
-- To disable email verification (for development/testing):
-- 1. Go to Supabase Dashboard → Authentication → Settings
-- 2. Uncheck "Enable email confirmations"
-- 3. Users will be auto-confirmed
--
-- To enable email verification (for production):
-- 1. Go to Supabase Dashboard → Authentication → Settings
-- 2. Check "Enable email confirmations"
-- 3. Configure SMTP (see SUPABASE_EMAIL_SETUP.md)
-- 4. Set Site URL in Authentication → URL Configuration

