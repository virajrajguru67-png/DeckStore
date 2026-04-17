/**
 * Demo Accounts Creation Script for Deck Store (MySQL Version)
 * 
 * This script creates demo accounts directly in the local MySQL database.
 * 
 * Usage:
 * node scripts/create-demo-accounts.js
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
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
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
} catch (e) {
  console.log('No .env file found, using process.env');
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'deck_store',
});

const demoAccounts = [
  { email: 'admin@deckstore.com', password: 'Admin123!', fullName: 'Admin User', role: 'admin' },
  { email: 'owner@deckstore.com', password: 'Owner123!', fullName: 'Owner User', role: 'owner' },
  { email: 'editor@deckstore.com', password: 'Editor123!', fullName: 'Editor User', role: 'editor' },
  { email: 'viewer@deckstore.com', password: 'Viewer123!', fullName: 'Viewer User', role: 'viewer' },
  { email: 'test@deckstore.com', password: 'Test123!', fullName: 'Test User', role: 'viewer' }
];

async function createDemoAccounts() {
  console.log('🚀 Creating MySQL demo accounts for Deck Store...\n');

  for (const account of demoAccounts) {
    try {
      // Check if user exists
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [account.email]);
      
      if (existing.length > 0) {
        console.log(`⚠️  User ${account.email} already exists. Skipping.`);
        continue;
      }

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(account.password, 10);

      // Insert User
      await pool.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, account.email, passwordHash]);
      
      // Insert Profile
      await pool.query('INSERT INTO profiles (id, full_name) VALUES (?, ?)', [userId, account.fullName]);
      
      // Insert Role
      await pool.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), userId, account.role]);

      console.log(`✅ Created ${account.email} (${account.role})`);
    } catch (error) {
      console.error(`❌ Error processsing ${account.email}:`, error.message);
    }
  }

  console.log('\n✨ MySQL demo accounts setup complete!\n');
  await pool.end();
}

createDemoAccounts().catch(err => {
  console.error(err);
  process.exit(1);
});
