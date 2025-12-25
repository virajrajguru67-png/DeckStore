# Complete Authentication Setup Guide

## 🚨 IMPORTANT: Run This First!

### Step 1: Run the SQL Fix (REQUIRED)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `deck-store/supabase/COMPLETE_AUTH_FIX.sql`
3. Copy **ALL** the SQL code
4. Paste it into the SQL Editor
5. Click **Run**
6. You should see: `✅ All authentication fixes applied successfully!`

This will:
- ✅ Create database trigger to auto-create profiles and roles
- ✅ Fix all RLS policies
- ✅ Create profiles/roles for existing users
- ✅ Grant necessary permissions

### Step 2: Disable Email Verification (For Development)

Since email verification isn't working, disable it temporarily:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **Email Auth** section
3. **Uncheck** "Enable email confirmations"
4. Click **Save**

**Note**: Users will now be automatically confirmed and can log in immediately.

### Step 3: Verify Environment Variables

Make sure you have a `.env` file in the `deck-store` directory with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

To find these:
1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Copy **Project URL** → `VITE_SUPABASE_URL`
3. Copy **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Step 4: Test Registration

1. Go to your app: `http://localhost:8080/auth`
2. Click "Sign up"
3. Enter:
   - Full Name: Your name
   - Email: Your email
   - Password: (at least 8 characters)
4. Click "Sign Up"
5. You should see: "Account created and signed in!"
6. You should be redirected to the dashboard

### Step 5: Verify Database

1. Go to **Supabase Dashboard** → **Table Editor**
2. Check **profiles** table - your profile should be there
3. Check **user_roles** table - your role should be "viewer"
4. Check **Authentication** → **Users** - your user should be there

### Step 6: Test Login

1. Sign out (if logged in)
2. Go to `/auth`
3. Enter your email and password
4. Click "Sign In"
5. You should be logged in and redirected

## Troubleshooting

### Issue: "Supabase not configured" error

**Solution**: 
- Check your `.env` file exists in `deck-store` directory
- Verify environment variables are correct
- Restart your dev server: `npm run dev`

### Issue: "useAuth must be used within an AuthProvider"

**Solution**:
- This should be fixed in the refactored code
- Clear browser cache and restart dev server
- Make sure `App.tsx` wraps everything in `AuthProvider`

### Issue: Registration succeeds but can't see data in database

**Solution**:
1. Run the SQL fix again: `COMPLETE_AUTH_FIX.sql`
2. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
3. Manually create profile for a user:
   ```sql
   -- Replace USER_ID with actual user ID
   INSERT INTO public.profiles (id, email, full_name)
   SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
   FROM auth.users WHERE id = 'USER_ID'
   ON CONFLICT (id) DO NOTHING;
   ```

### Issue: Can't log in after registration

**Solution**:
1. Check if email verification is disabled (Step 2)
2. Check browser console for errors
3. Verify user exists in **Authentication** → **Users**
4. Try resetting password if needed

### Issue: "Email not confirmed" error

**Solution**:
- Disable email confirmations (Step 2)
- OR configure SMTP properly (see `SUPABASE_EMAIL_SETUP.md`)

## For Production

When ready for production:

1. **Enable email confirmations** in Authentication → Settings
2. **Configure SMTP** (see `SUPABASE_EMAIL_SETUP.md`)
3. **Set Site URL** in Authentication → URL Configuration
4. **Test email delivery** before going live

## What Was Fixed

✅ Database trigger auto-creates profiles and roles
✅ RLS policies fixed to allow proper access
✅ Sign up flow handles email verification properly
✅ Sign in flow shows clear error messages
✅ Better error handling throughout
✅ Automatic user data fetching after signup/login

## Files Changed

- `src/contexts/AuthContext.tsx` - Refactored sign up/in logic
- `src/pages/Auth.tsx` - Better error handling and user feedback
- `supabase/COMPLETE_AUTH_FIX.sql` - Complete database fix

## Next Steps

After fixing authentication:
1. Test registration with a new account
2. Test login
3. Verify data appears in database tables
4. Test protected routes work correctly

