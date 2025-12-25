# 🚀 Quick Start: Create Demo Accounts

## Method 1: Using Node.js Script (Easiest - Recommended)

### Step 1: Get Service Role Key

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Find **service_role** key (⚠️ Keep this secret - it has admin access!)
3. Copy it

### Step 2: Add to .env File

Create or edit `.env` file in `deck-store` directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Run the Script

```bash
cd deck-store
npm run create-demo-accounts
```

Or directly:
```bash
node scripts/create-demo-accounts.js
```

### Step 4: Done! ✅

The script will create 5 demo accounts. Use these to login:

---

## 📋 Demo Account Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@deckstore.com` | `Admin123!` |
| **Owner** | `owner@deckstore.com` | `Owner123!` |
| **Editor** | `editor@deckstore.com` | `Editor123!` |
| **Viewer** | `viewer@deckstore.com` | `Viewer123!` |
| **Test** | `test@deckstore.com` | `Test123!` |

---

## Method 2: Manual Creation (If Script Doesn't Work)

### Step 1: Create Users in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. For each account:
   - **Email**: `admin@deckstore.com`
   - **Password**: `Admin123!`
   - ✅ Check **"Auto Confirm User"** (IMPORTANT!)
   - Click **"Create user"**
4. Repeat for all 5 accounts

### Step 2: Run SQL to Set Roles

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `deck-store/supabase/CREATE_DEMO_ACCOUNTS.sql`
3. Run **STEP 2** section (creates profiles and roles)
4. Run **STEP 4** section (verifies emails)

---

## ✅ Verify Accounts

After creating accounts, verify they work:

1. Go to `http://localhost:8080/auth`
2. Try logging in with `admin@deckstore.com` / `Admin123!`
3. You should be logged in and see the dashboard
4. Check sidebar - admin should see admin pages

---

## 🔧 Troubleshooting

### "Missing environment variables" error
- Make sure `.env` file exists in `deck-store` directory
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Restart terminal after creating `.env` file

### "User already exists" 
- Script will update existing users
- Or delete user from Supabase Dashboard and run again

### Can't login after creation
- Make sure **email verification is disabled** in Supabase Settings
- Or run STEP 4 in `CREATE_DEMO_ACCOUNTS.sql` to verify emails

### Script fails with permission error
- Make sure you're using **service_role** key (not anon key)
- Service role key is in Project Settings → API → service_role

---

## 📝 What the Script Does

1. ✅ Creates 5 users in Supabase Auth
2. ✅ Auto-confirms their emails (can login immediately)
3. ✅ Creates profiles for each user
4. ✅ Assigns correct roles (admin, owner, editor, viewer)
5. ✅ Shows you all the credentials

---

## 🎯 Next Steps

After creating demo accounts:

1. ✅ Test login with different roles
2. ✅ Verify admin can access admin pages
3. ✅ Test file upload functionality
4. ✅ Test folder creation
5. ✅ Test sharing features

---

## 🔒 Security Reminder

⚠️ **These are demo accounts with simple passwords!**
- Only for development/testing
- Change passwords before production
- Consider deleting in production

---

## 📚 More Info

- See `DEMO_ACCOUNTS.md` for detailed information
- See `AUTH_SETUP_COMPLETE.md` for full authentication setup
- See `FIX_LOGIN_NOW.md` if you have login issues

