import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true // Critical for running schema files
  });

  console.log('Connected to MySQL. Running migration...');

  try {
    const schemaPath = path.join(__dirname, '../mysql_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await connection.query(schema);
    console.log('✅ MySQL Tables created successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
