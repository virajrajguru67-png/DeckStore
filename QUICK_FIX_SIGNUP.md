# Quick Fix for Signup Issues

## Problem
1. Email verification emails not arriving
2. User data not appearing in database tables (profiles, user_roles)

## Solution

### Step 1: Run the SQL Fix

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `deck-store/supabase/fix_all_signup_issues.sql`
3. Copy **ALL** the SQL code
4. Paste it into the SQL Editor
5. Click **Run**

This will:
- ✅ Create a database trigger to auto-create profiles and roles
- ✅ Fix RLS policies to allow viewing data
- ✅ Create profiles/roles for any existing users

### Step 2: Disable Email Verification (For Development)

Since emails aren't arriving, disable email confirmation temporarily:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **Email Auth** section
3. **Uncheck** "Enable email confirmations"
4. Click **Save**

Now users will be automatically confirmed and can log in immediately.

### Step 3: Verify the Fix

1. Try signing up a new user
2. Check **Authentication** → **Users** - user should appear
3. Check **Table Editor** → **profiles** - profile should be created
4. Check **Table Editor** → **user_roles** - role should be assigned
5. Try logging in - should work immediately

### Step 4: For Production (Later)

When ready for production:

1. **Enable email confirmations** in Authentication → Settings
2. **Configure SMTP** (see `SUPABASE_EMAIL_SETUP.md`)
3. **Set Site URL** in Authentication → URL Configuration

## Troubleshooting

### If data still not showing:

1. **Check if trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Check if function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. **Manually create profile for a user:**
   ```sql
   -- Replace USER_ID with actual user ID from auth.users
   INSERT INTO public.profiles (id, email, full_name)
   SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
   FROM auth.users
   WHERE id = 'USER_ID'
   ON CONFLICT (id) DO NOTHING;
   
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID', 'viewer')
   ON CONFLICT (user_id) DO NOTHING;
   ```

### If still can't login:

1. Check browser console for errors
2. Verify Supabase environment variables are set correctly
3. Check Supabase Dashboard → Logs → Auth Logs for errors

