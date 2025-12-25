# Supabase Email Verification Setup Guide

## Issue: Verification emails not being sent

If verification emails are not being received, follow these steps:

## 1. Check Supabase Dashboard Settings

### Enable Email Confirmation

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, ensure:
   - ✅ **Enable email confirmations** is checked
   - ✅ **Enable email signup** is checked

### Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Check that the **Confirm signup** template is enabled
3. Customize the template if needed (optional)

## 2. Configure SMTP (Required for Production)

By default, Supabase uses their own SMTP service, but it has limitations:
- Limited to 3 emails per hour per user
- May go to spam folders
- Not suitable for production

### Option A: Use Supabase's Built-in SMTP (Development Only)

For development, Supabase's default SMTP should work, but emails might:
- Be delayed
- Go to spam
- Have rate limits

### Option B: Configure Custom SMTP (Recommended for Production)

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Enter your SMTP credentials:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)
   - **Port**: Usually `587` (TLS) or `465` (SSL)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password
   - **Sender email**: The email address that will send verification emails
   - **Sender name**: Display name for emails

### Popular SMTP Providers:

- **SendGrid**: Free tier: 100 emails/day
- **Mailgun**: Free tier: 5,000 emails/month
- **Amazon SES**: Very affordable, pay-as-you-go
- **Gmail**: Requires App Password (not recommended for production)

## 3. Check Email Redirect URL

The redirect URL in your code should match your site URL:

```typescript
const redirectUrl = `${window.location.origin}/`;
```

Make sure this matches your **Site URL** in Supabase:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your application URL (e.g., `http://localhost:8080` for dev)
3. Add **Redirect URLs** if needed

## 4. Check Spam Folder

Verification emails might be in your spam/junk folder. Check there first.

## 5. Check Rate Limits

Supabase has rate limits on emails:
- Default SMTP: 3 emails per hour per user
- If you've sent multiple signup attempts, wait before trying again

## 6. For Development: Disable Email Confirmation (Not Recommended)

⚠️ **Only for local development!**

If you want to disable email confirmation for testing:

1. Go to **Authentication** → **Settings**
2. Uncheck **Enable email confirmations**
3. Users will be automatically confirmed

**Note**: This is NOT recommended for production as it reduces security.

## 7. Test Email Configuration

1. Try signing up with a new email
2. Check the Supabase Dashboard → **Authentication** → **Users**
3. Check if the user was created and if email was sent
4. Check **Logs** → **Auth Logs** for any errors

## 8. Verify Email Template

1. Go to **Authentication** → **Email Templates** → **Confirm signup**
2. Ensure the template has:
   - `{{ .ConfirmationURL }}` for the confirmation link
   - Proper formatting

## Troubleshooting Steps

1. ✅ Check Supabase Dashboard → **Authentication** → **Settings**
2. ✅ Verify email confirmation is enabled
3. ✅ Check **Site URL** and **Redirect URLs** are correct
4. ✅ Check spam folder
5. ✅ Wait for rate limit to reset (if applicable)
6. ✅ Check **Logs** → **Auth Logs** for errors
7. ✅ Configure custom SMTP if using in production

## Quick Fix for Development

If you just need to test without email verification:

1. In Supabase Dashboard → **Authentication** → **Settings**
2. Uncheck **Enable email confirmations**
3. Users will be auto-confirmed (for development only!)

## Production Checklist

- [ ] Custom SMTP configured
- [ ] Email templates customized
- [ ] Site URL configured correctly
- [ ] Redirect URLs added
- [ ] Email confirmation enabled
- [ ] Tested email delivery

