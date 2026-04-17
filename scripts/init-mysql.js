import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const users = [
  { email: 'admin@deckstore.com', password: 'Admin123!', fullName: 'Admin User', role: 'admin' },
  { email: 'owner@deckstore.com', password: 'Owner123!', fullName: 'Owner User', role: 'owner' },
  { email: 'editor@deckstore.com', password: 'Editor123!', fullName: 'Editor User', role: 'editor' },
  { email: 'viewer@deckstore.com', password: 'Viewer123!', fullName: 'Viewer User', role: 'viewer' },
  { email: 'test@deckstore.com', password: 'Test123!', fullName: 'Test User', role: 'viewer' }
];

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'deck_store'
  });

  console.log('Connected to MySQL. Seeding users...');

  try {
    for (const u of users) {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(u.password, 10);

      // Check if user exists
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (existing.length > 0) {
        console.log(`User ${u.email} already exists, skipping...`);
        continue;
      }

      await connection.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [id, u.email, hashedPassword]);
      await connection.query('INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)', [id, u.email, u.fullName]);
      await connection.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), id, u.role]);
      await connection.query('INSERT INTO storage_quotas (id, user_id, total_quota_bytes, used_bytes) VALUES (?, ?, ?, ?)', [uuidv4(), id, 10737418240, 0]);
      
      console.log(`✅ Created ${u.email} with role ${u.role}`);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await connection.end();
  }
}

init();
