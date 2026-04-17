import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'deck_store'
  });

  try {
    console.log('Running migration...');
    await pool.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT TRUE, 
      ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT TRUE, 
      ADD COLUMN IF NOT EXISTS notification_weekly BOOLEAN DEFAULT TRUE, 
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
    `);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
