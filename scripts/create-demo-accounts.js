/**
 * Demo Accounts Creation Script for Deck Store
 * 
 * This script creates demo accounts using Supabase Admin API
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install @supabase/supabase-js
 * 2. Create a .env file in deck-store directory with:
 *    - SUPABASE_URL=your_supabase_url
 *    - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (from Supabase Dashboard > Settings > API)
 * 
 * Usage:
 * node scripts/create-demo-accounts.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Simple .env file loader
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

try {
  const envFile = readFileSync(join(projectRoot, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      const envKey = key.trim();
      if (envKey && !process.env[envKey]) {
        process.env[envKey] = value;
      }
    }
  });
} catch (e) {
  // .env file not found, use environment variables directly
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.log('\nPlease set the following in your .env file:');
  console.log('  SUPABASE_URL=your_supabase_url');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('\nGet your service role key from: Supabase Dashboard > Settings > API');
  console.log('⚠️  WARNING: Service role key has admin access - keep it secret!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoAccounts = [
  {
    email: 'admin@deckstore.com',
    password: 'Admin123!',
    fullName: 'Admin User',
    role: 'admin'
  },
  {
    email: 'owner@deckstore.com',
    password: 'Owner123!',
    fullName: 'Owner User',
    role: 'owner'
  },
  {
    email: 'editor@deckstore.com',
    password: 'Editor123!',
    fullName: 'Editor User',
    role: 'editor'
  },
  {
    email: 'viewer@deckstore.com',
    password: 'Viewer123!',
    fullName: 'Viewer User',
    role: 'viewer'
  },
  {
    email: 'test@deckstore.com',
    password: 'Test123!',
    fullName: 'Test User',
    role: 'viewer'
  }
];

async function createDemoAccounts() {
  console.log('🚀 Creating demo accounts for Deck Store...\n');

  const createdUsers = [];
  const errors = [];

  for (const account of demoAccounts) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === account.email);

      if (existingUser) {
        console.log(`⚠️  User ${account.email} already exists. Updating...`);
        
        // Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { full_name: account.fullName },
          email_confirm: true // Auto-confirm email
        });
        
        // Delete existing roles
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', existingUser.id);
        
        // Insert new role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: existingUser.id, role: account.role });

        if (roleError) {
          console.error(`❌ Failed to update role for ${account.email}:`, roleError.message);
          errors.push({ email: account.email, error: roleError.message });
        } else {
          console.log(`✅ Updated ${account.email} with role ${account.role}`);
          createdUsers.push({ ...account, id: existingUser.id });
        }
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email so they can login immediately
          user_metadata: { full_name: account.fullName }
        });

        if (userError) {
          console.error(`❌ Failed to create ${account.email}:`, userError.message);
          errors.push({ email: account.email, error: userError.message });
          continue;
        }

        // Wait a moment for the trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update role (trigger might have created viewer, so we'll update it)
        const { error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', newUser.user.id);
        
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role: account.role });

        if (roleError) {
          console.error(`❌ Failed to assign role for ${account.email}:`, roleError.message);
          errors.push({ email: account.email, error: roleError.message });
        } else {
          console.log(`✅ Created ${account.email} with role ${account.role}`);
          createdUsers.push({ ...account, id: newUser.user.id });
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error?.message || error);
      errors.push({ email: account.email, error: error?.message || String(error) });
    }
  }

  console.log('\n✨ Demo accounts setup complete!\n');
  
  if (createdUsers.length > 0) {
    console.log('📋 Demo Account Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    createdUsers.forEach(account => {
      console.log(`\n${account.role.toUpperCase()}:`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Password: ${account.password}`);
      console.log(`  Full Name: ${account.fullName}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  if (errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    errors.forEach(err => {
      console.log(`  - ${err.email}: ${err.error}`);
    });
    console.log('');
  }

  console.log('💡 Tip: Make sure email verification is disabled in Supabase Dashboard');
  console.log('   Authentication → Settings → Uncheck "Enable email confirmations"\n');
}

createDemoAccounts().catch(console.error);

