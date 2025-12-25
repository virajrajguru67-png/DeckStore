# 🚨 FIX LOGIN ISSUE - Step by Step

## Problem
- Registered account but can't login
- Email verification email not arriving
- Shows "verify your email" but no email received

## ✅ QUICK FIX (Choose One Method)

### Method 1: Disable Email Verification (EASIEST - Recommended for Development)

**This is the fastest solution:**

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **Email Auth** section
3. **Uncheck** "Enable email confirmations"
4. Click **Save**

**Now try logging in again - it should work immediately!**

---

### Method 2: Manually Verify Your User (If you want to keep email verification enabled)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `deck-store/supabase/MANUAL_VERIFY_USERS.sql`
3. Find the section "OPTION 1: Verify a specific user by email"
4. Replace `'user@example.com'` with **your actual email address**
5. Run the SQL:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = now()
   WHERE email = 'your-email@example.com' AND email_confirmed_at IS NULL;
   ```
6. Click **Run**

**Now try logging in - it should work!**

---

### Method 3: Use Resend Verification Email Feature

1. Go to your app: `http://localhost:8080/auth`
2. Make sure you're on the **Sign In** page
3. Enter your email address
4. If you see "Email not verified" error, a **"Resend Verification Email"** button will appear
5. Click the button
6. Check your email (including spam folder)
7. Click the verification link in the email
8. Try logging in again

---

## 🔍 Verify Your User Status

To check if your user is verified:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:
   ```sql
   SELECT 
     email,
     email_confirmed_at,
     created_at,
     CASE 
       WHEN email_confirmed_at IS NULL THEN '❌ Not Verified'
       ELSE '✅ Verified'
     END as status
   FROM auth.users
   ORDER BY created_at DESC;
   ```
3. This will show all users and their verification status

---

## 📋 Complete Setup Checklist

Before trying to login, make sure:

- [ ] **Run SQL Fix**: `COMPLETE_AUTH_FIX.sql` (if not done already)
- [ ] **Disable Email Verification** OR **Manually verify your user**
- [ ] **Environment variables** are set in `.env` file
- [ ] **Restart dev server** after changes

---

## 🎯 Recommended Solution for Development

**For development/testing, I recommend Method 1 (Disable Email Verification):**

1. It's the fastest
2. No need to check emails
3. Users can login immediately
4. You can enable it later for production

**Steps:**
1. Supabase Dashboard → Authentication → Settings
2. Uncheck "Enable email confirmations"
3. Save
4. Try logging in - **should work now!**

---

## 🐛 Still Can't Login?

If you still can't login after trying the above:

1. **Check browser console** for errors (F12 → Console tab)
2. **Check Supabase Dashboard** → **Logs** → **Auth Logs** for errors
3. **Verify your password** is correct
4. **Try resetting password**:
   - Go to Supabase Dashboard → Authentication → Users
   - Find your user
   - Click "Reset Password"
   - Check email for reset link

---

## 📝 For Production (Later)

When ready for production:

1. **Enable email confirmations** in Authentication → Settings
2. **Configure SMTP** (see `SUPABASE_EMAIL_SETUP.md`)
3. **Set Site URL** in Authentication → URL Configuration
4. **Test email delivery** before going live

---

## ✅ After Fixing

Once you can login:

1. ✅ Verify you can access the dashboard
2. ✅ Check that your profile appears in the database
3. ✅ Verify your role is set to "viewer"
4. ✅ Test file upload functionality

---

## 🆘 Need Help?

If nothing works:

1. Check `AUTH_SETUP_COMPLETE.md` for detailed setup
2. Verify all SQL fixes have been run
3. Check Supabase project is active and not paused
4. Verify environment variables are correct

