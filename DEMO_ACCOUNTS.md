# Demo Accounts for Deck Store

## 📋 Demo Account Credentials

After running the creation script, use these credentials to login:

### Admin Account
- **Email**: `admin@deckstore.com`
- **Password**: `Admin123!`
- **Role**: Admin (full access)

### Owner Account
- **Email**: `owner@deckstore.com`
- **Password**: `Owner123!`
- **Role**: Owner (full access)

### Editor Account
- **Email**: `editor@deckstore.com`
- **Password**: `Editor123!`
- **Role**: Editor (can edit files)

### Viewer Account
- **Email**: `viewer@deckstore.com`
- **Password**: `Viewer123!`
- **Role**: Viewer (read-only access)

### Test Account
- **Email**: `test@deckstore.com`
- **Password**: `Test123!`
- **Role**: Viewer (read-only access)

---

## 🚀 How to Create Demo Accounts

### Method 1: Using Node.js Script (Recommended)

1. **Get your Supabase Service Role Key:**
   - Go to **Supabase Dashboard** → **Project Settings** → **API**
   - Copy the **service_role** key (⚠️ Keep this secret!)

2. **Add to .env file:**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run the script:**
   ```bash
   cd deck-store
   node scripts/create-demo-accounts.js
   ```

4. **You should see:**
   ```
   ✅ Created admin@deckstore.com with role admin
   ✅ Created owner@deckstore.com with role owner
   ...
   ```

### Method 2: Manual Creation via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. For each account:
   - Enter email (e.g., `admin@deckstore.com`)
   - Enter password (e.g., `Admin123!`)
   - Check **"Auto Confirm User"** (important!)
   - Click **"Create user"**

4. **Assign roles** (run in SQL Editor):
   ```sql
   -- Replace USER_ID with the actual user ID from auth.users
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID', 'admin')
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
   ```

### Method 3: Quick SQL Creation (Advanced)

If you have the user IDs, you can run this in SQL Editor:

```sql
-- This assumes users are already created in auth.users
-- You'll need to get the user IDs first

-- Get user IDs
SELECT id, email FROM auth.users WHERE email IN (
  'admin@deckstore.com',
  'owner@deckstore.com',
  'editor@deckstore.com',
  'viewer@deckstore.com',
  'test@deckstore.com'
);

-- Then update roles (replace USER_IDs with actual IDs)
UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'USER_ID_FOR_ADMIN';
UPDATE public.user_roles SET role = 'owner' WHERE user_id = 'USER_ID_FOR_OWNER';
UPDATE public.user_roles SET role = 'editor' WHERE user_id = 'USER_ID_FOR_EDITOR';
UPDATE public.user_roles SET role = 'viewer' WHERE user_id = 'USER_ID_FOR_VIEWER';
```

---

## ✅ After Creating Accounts

1. **Disable email verification** (if not already done):
   - Supabase Dashboard → Authentication → Settings
   - Uncheck "Enable email confirmations"

2. **Test login:**
   - Go to `http://localhost:8080/auth`
   - Try logging in with any of the demo accounts
   - You should be able to access the dashboard

3. **Verify roles:**
   - Login as admin → Should see admin pages in sidebar
   - Login as viewer → Should NOT see admin pages
   - Login as editor → Should be able to edit files

---

## 🔒 Security Note

⚠️ **These are demo accounts with simple passwords!**
- Only use for development/testing
- Change passwords before deploying to production
- Consider deleting these accounts in production

---

## 🐛 Troubleshooting

### "User already exists" error
- The script will update existing users
- Or delete the user from Supabase Dashboard and run script again

### "Failed to assign role" error
- Make sure you ran `COMPLETE_AUTH_FIX.sql` first
- Check that `user_roles` table exists
- Verify RLS policies allow inserts

### Can't login after creation
- Make sure email verification is disabled
- Check user exists in Authentication → Users
- Verify user has `email_confirmed_at` set (or disable email verification)

---

## 📝 Notes

- All accounts are **auto-confirmed** (can login immediately)
- Profiles and roles are created automatically by database trigger
- Passwords are simple for easy testing - change in production!

