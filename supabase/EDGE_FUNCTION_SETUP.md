# Edge Function Setup for User Creation

## Overview

The `create-user` Edge Function allows admins to create users from the UI without needing direct access to the Supabase Admin API.

## Setup Instructions

### 1. Deploy the Edge Function

Make sure you have the Supabase CLI installed and logged in:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref
```

### 2. Deploy the Function

```bash
cd deck-store
supabase functions deploy create-user
```

### 3. Set Environment Variables

The Edge Function needs the service role key. Set it in your Supabase project:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Add the following secrets:
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Project Settings → API)

Or use the CLI:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Verify the Function

After deployment, the function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/create-user
```

## How It Works

1. The client calls the Edge Function with user credentials
2. The function verifies the caller has admin/owner role
3. The function uses the service role key to create the user via Admin API
4. The function creates the profile and assigns the role
5. Returns success or error response

## Security

- Only users with `admin` or `owner` role can call this function
- The function uses the service role key server-side (never exposed to client)
- All requests are authenticated via JWT token

## Troubleshooting

### Function not found (404)
- Make sure the function is deployed: `supabase functions deploy create-user`
- Check the function name matches exactly

### Unauthorized (401/403)
- Verify the user has admin or owner role
- Check the JWT token is being sent correctly

### Service role key error
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set as a secret
- Verify the key is correct (from Project Settings → API)


