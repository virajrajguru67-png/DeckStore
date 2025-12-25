-- Create Demo Accounts via SQL
-- NOTE: This SQL script can only create profiles and roles
-- You still need to create the auth users manually or use the Node.js script
-- 
-- To create users manually:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
-- 2. Create users with these emails and passwords
-- 3. Then run this SQL to set up profiles and roles

-- ============================================
-- DEMO ACCOUNTS TO CREATE:
-- ============================================
-- 1. admin@deckstore.com / Admin123!
-- 2. owner@deckstore.com / Owner123!
-- 3. editor@deckstore.com / Editor123!
-- 4. viewer@deckstore.com / Viewer123!
-- 5. test@deckstore.com / Test123!

-- ============================================
-- STEP 1: Get User IDs (Run this first)
-- ============================================
-- This will show you the user IDs for the demo accounts
-- Copy the IDs and use them in STEP 2

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
)
ORDER BY email;

-- ============================================
-- STEP 2: Create Profiles and Roles
-- ============================================
-- Replace the USER_IDs below with actual IDs from STEP 1
-- Or use the email-based approach below

-- Create/Update profiles for demo accounts
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  CASE u.email
    WHEN 'admin@deckstore.com' THEN 'Admin User'
    WHEN 'owner@deckstore.com' THEN 'Owner User'
    WHEN 'editor@deckstore.com' THEN 'Editor User'
    WHEN 'viewer@deckstore.com' THEN 'Viewer User'
    WHEN 'test@deckstore.com' THEN 'Test User'
    ELSE split_part(u.email, '@', 1)
  END as full_name,
  u.created_at,
  now()
FROM auth.users u
WHERE u.email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Create/Update roles for demo accounts
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  u.id,
  CASE u.email
    WHEN 'admin@deckstore.com' THEN 'admin'::app_role
    WHEN 'owner@deckstore.com' THEN 'owner'::app_role
    WHEN 'editor@deckstore.com' THEN 'editor'::app_role
    WHEN 'viewer@deckstore.com' THEN 'viewer'::app_role
    WHEN 'test@deckstore.com' THEN 'viewer'::app_role
    ELSE 'viewer'::app_role
  END as role,
  now()
FROM auth.users u
WHERE u.email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;

-- ============================================
-- STEP 3: Verify Accounts Created
-- ============================================
-- Run this to verify all accounts are set up correctly

SELECT 
  u.email,
  u.email_confirmed_at,
  p.full_name,
  ur.role,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '❌ Not Verified'
    ELSE '✅ Verified'
  END as email_status,
  CASE 
    WHEN p.id IS NULL THEN '❌ No Profile'
    ELSE '✅ Has Profile'
  END as profile_status,
  CASE 
    WHEN ur.user_id IS NULL THEN '❌ No Role'
    ELSE '✅ Has Role'
  END as role_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
)
ORDER BY u.email;

-- ============================================
-- STEP 4: Auto-verify Email (Optional)
-- ============================================
-- If email verification is enabled, run this to verify all demo accounts

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
)
AND email_confirmed_at IS NULL;

