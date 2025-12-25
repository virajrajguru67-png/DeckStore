-- Manual Email Verification Fix
-- Use this to manually verify users who can't receive verification emails
-- Run this in Supabase SQL Editor

-- ============================================
-- OPTION 1: Verify a specific user by email
-- ============================================
-- Replace 'user@example.com' with the actual email address

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'user@example.com' AND email_confirmed_at IS NULL;

-- ============================================
-- OPTION 2: Verify ALL unverified users
-- ============================================
-- WARNING: This verifies ALL users. Only use for development!

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- ============================================
-- OPTION 3: Check unverified users
-- ============================================
-- Run this first to see which users need verification

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Not Verified'
    ELSE '✅ Verified'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- OPTION 4: Verify user by ID
-- ============================================
-- Replace 'USER_ID_HERE' with the actual user ID

UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = 'USER_ID_HERE' AND email_confirmed_at IS NULL;

