-- Assign user roles based on email addresses
-- This script allows you to assign roles to users based on their email patterns
-- 
-- INSTRUCTIONS:
-- 1. Review the examples below
-- 2. Modify the email patterns and roles as needed
-- 3. Run the specific UPDATE queries for your use case

-- ============================================================
-- Example 1: Assign role to a specific email
-- ============================================================
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT p.id, 'admin'::app_role
-- FROM public.profiles p
-- WHERE p.email = 'admin@example.com'
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- Example 2: Assign role to multiple specific emails
-- ============================================================
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT p.id, 'admin'::app_role
-- FROM public.profiles p
-- WHERE p.email IN ('admin@example.com', 'manager@example.com', 'owner@example.com')
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- Example 3: Assign role based on email domain
-- ============================================================
-- All users with @example.com domain get admin role
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT p.id, 'admin'::app_role
-- FROM public.profiles p
-- WHERE p.email LIKE '%@example.com'
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- Example 4: Assign role based on email prefix
-- ============================================================
-- All users with email starting with 'admin.' get admin role
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT p.id, 'admin'::app_role
-- FROM public.profiles p
-- WHERE p.email LIKE 'admin.%@%'
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- Example 5: Assign different roles to different users
-- ============================================================
-- First user gets owner, second gets admin
-- UPDATE public.user_roles ur
-- SET role = CASE 
--   WHEN p.email = 'owner@example.com' THEN 'owner'::app_role
--   WHEN p.email = 'admin@example.com' THEN 'admin'::app_role
--   WHEN p.email LIKE 'editor.%@%' THEN 'editor'::app_role
--   ELSE ur.role
-- END
-- FROM public.profiles p
-- WHERE ur.user_id = p.id
--   AND (
--     p.email = 'owner@example.com'
--     OR p.email = 'admin@example.com'
--     OR p.email LIKE 'editor.%@%'
--   );

-- ============================================================
-- View all users with their current roles
-- ============================================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  COALESCE(ur.role, 'viewer'::app_role) as current_role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
ORDER BY p.email;

-- ============================================================
-- View users without roles (they will default to 'viewer')
-- ============================================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  'viewer'::app_role as default_role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL
ORDER BY p.email;

-- ============================================================
-- Create role for users who don't have one
-- ============================================================
-- This ensures all users have a role record
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT p.id, 'viewer'::app_role
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON p.id = ur.user_id
-- WHERE ur.id IS NULL;

-- ============================================================
-- Bulk assign roles based on your requirements
-- ============================================================
-- Customize this query based on your email patterns:

-- Method 1: Using UPSERT (insert or update)
-- Replace 'admin@deckstore.com' with actual admin emails
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email IN ('admin@deckstore.com')  -- Add more emails here
ON CONFLICT (user_id) 
DO UPDATE SET role = EXCLUDED.role;

-- Replace 'owner@deckstore.com' with actual owner emails
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'owner'::app_role
FROM public.profiles p
WHERE p.email IN ('owner@deckstore.com')  -- Add more emails here
ON CONFLICT (user_id) 
DO UPDATE SET role = EXCLUDED.role;

-- Replace 'editor@deckstore.com' with actual editor emails
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'editor'::app_role
FROM public.profiles p
WHERE p.email IN ('editor@deckstore.com')  -- Add more emails here
ON CONFLICT (user_id) 
DO UPDATE SET role = EXCLUDED.role;

-- Method 2: Direct UPDATE (if role already exists)
-- Use this if the user already has a role record

-- UPDATE public.user_roles ur
-- SET role = 'admin'
-- FROM public.profiles p
-- WHERE ur.user_id = p.id
--   AND p.email IN ('admin@deckstore.com');  -- Add more emails here

-- UPDATE public.user_roles ur
-- SET role = 'owner'
-- FROM public.profiles p
-- WHERE ur.user_id = p.id
--   AND p.email IN ('owner@deckstore.com');  -- Add more emails here

-- UPDATE public.user_roles ur
-- SET role = 'editor'
-- FROM public.profiles p
-- WHERE ur.user_id = p.id
--   AND p.email IN ('editor@deckstore.com');  -- Add more emails here

-- ============================================================
-- Verify the changes
-- ============================================================
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.created_at as role_created_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
ORDER BY ur.role, p.email;

