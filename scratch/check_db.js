import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'deck_store',
  });

  try {
    const [users] = await pool.query('SELECT id, email FROM users');
    console.log('Users:', users);

    const [folders] = await pool.query('SELECT name, owner_id, deleted_at FROM folders');
    console.log('Folders:', folders);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
