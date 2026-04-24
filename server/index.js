import express from 'express';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Static files
app.use('/uploads', (req, res, next) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    jwt.verify(token, process.env.JWT_SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}, express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'deck_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const [roles] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [user.id]);
    const role = roles.length > 0 ? roles[0].role : 'viewer';

    const token = jwt.sign({ id: user.id, email: user.email, role }, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, email, passwordHash]);
    await connection.query('INSERT INTO profiles (id, full_name, email) VALUES (?, ?, ?)', [userId, fullName, email]);
    await connection.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), userId, 'viewer']);
    await connection.commit();
    res.status(201).json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally { connection.release(); }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const [profiles] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.user.id]);
    const [roles] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [req.user.id]);
    res.json({ user: { ...users[0], role: roles[0]?.role || 'viewer' }, profile: profiles[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search-all', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    const query = `%${q}%`;
    const [files] = await pool.query('SELECT * FROM files WHERE owner_id = ? AND name LIKE ? AND deleted_at IS NULL', [req.user.id, query]);
    const [folders] = await pool.query('SELECT * FROM folders WHERE owner_id = ? AND name LIKE ? AND deleted_at IS NULL', [req.user.id, query]);
    const [documents] = await pool.query('SELECT * FROM documents WHERE owner_id = ? AND name LIKE ? AND deleted_at IS NULL', [req.user.id, query]);
    res.json({ files, folders, documents });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/profiles/update', authenticateToken, async (req, res) => {
  const { full_name, avatar_url, notification_email, notification_push, notification_weekly, two_factor_enabled } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO profiles (id, full_name, email, notification_email, notification_push, notification_weekly, two_factor_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [req.user.id, full_name || '', req.user.email, notification_email ?? true, notification_push ?? true, notification_weekly ?? true, two_factor_enabled ?? false]
      );
    } else {
      const updates = [];
      const values = [];
      if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name); }
      if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }
      if (notification_email !== undefined) { updates.push('notification_email = ?'); values.push(notification_email); }
      if (notification_push !== undefined) { updates.push('notification_push = ?'); values.push(notification_push); }
      if (notification_weekly !== undefined) { updates.push('notification_weekly = ?'); values.push(notification_weekly); }
      if (two_factor_enabled !== undefined) { updates.push('two_factor_enabled = ?'); values.push(two_factor_enabled); }
      
      if (updates.length > 0) {
        values.push(req.user.id);
        await pool.query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Current password incorrect' });

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);
    
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/files', authenticateToken, async (req, res) => {
  const { folderId } = req.query;
  try {
    let q = 'SELECT * FROM files WHERE owner_id = ? AND deleted_at IS NULL';
    const params = [req.user.id];
    if (folderId) { q += ' AND folder_id = ?'; params.push(folderId); }
    else if (folderId === undefined) { q += ' AND folder_id IS NULL'; }
    const [rows] = await pool.query(q, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/folders', authenticateToken, async (req, res) => {
  const { parentId } = req.query;
  try {
    let q = 'SELECT * FROM folders WHERE owner_id = ? AND deleted_at IS NULL';
    const params = [req.user.id];
    if (parentId) { q += ' AND parent_folder_id = ?'; params.push(parentId); }
    else if (parentId === 'null' || parentId === undefined) { q += ' AND parent_folder_id IS NULL'; }
    const [rows] = await pool.query(q, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.get('/api/files/favorites', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE owner_id = ? AND deleted_at IS NULL AND JSON_EXTRACT(metadata, "$.is_favorite") = true', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/folders/favorites', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM folders WHERE owner_id = ? AND deleted_at IS NULL AND is_favorite = true', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.get('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/files/:id/download', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];
    const filePath = path.join(__dirname, '../uploads', file.storage_key);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File data missing on disk' });
    res.download(filePath, file.name);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/favorite', authenticateToken, async (req, res) => {
  try {
    // We might need an is_favorite column, adding it to metadata for now if missing
    await pool.query('UPDATE files SET metadata = JSON_SET(IFNULL(metadata, "{}"), "$.is_favorite", ?) WHERE id = ? AND owner_id = ?', [req.body.isFavorite, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/favorite', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE folders SET is_favorite = ? WHERE id = ? AND owner_id = ?', [req.body.isFavorite, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/folders/:id', authenticateToken, async (req, res) => {

  try {
    const [rows] = await pool.query('SELECT * FROM folders WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
  const { name, parent_folder_id } = req.body;
  const id = uuidv4();
  try {
    let folderPath = name;
    if (parent_folder_id) {
      const [parents] = await pool.query('SELECT path FROM folders WHERE id = ?', [parent_folder_id]);
      if (parents.length > 0) {
        folderPath = `${parents[0].path}/${name}`;
      }
    }
    await pool.query(
      'INSERT INTO folders (id, name, parent_folder_id, owner_id, path) VALUES (?, ?, ?, ?, ?)',
      [id, name, parent_folder_id || null, req.user.id, folderPath]
    );
    const [rows] = await pool.query('SELECT * FROM folders WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const { folder_id } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const id = uuidv4();
  try {
    let parentPath = '/';
    if (folder_id) {
      const [folders] = await pool.query('SELECT path FROM folders WHERE id = ?', [folder_id]);
      if (folders.length > 0) parentPath = folders[0].path;
    }
    
    const filePath = parentPath === '/' ? file.originalname : `${parentPath}/${file.originalname}`;

    await pool.query(
      'INSERT INTO files (id, name, path, mime_type, size, storage_key, folder_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, file.originalname, filePath, file.mimetype, file.size, file.filename, folder_id || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.post('/api/files/:id/delete', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE files SET deleted_at = NOW() WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/delete', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE folders SET deleted_at = NOW() WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/rename', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE files SET name = ? WHERE id = ? AND owner_id = ?', [req.body.name, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/rename', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE folders SET name = ? WHERE id = ? AND owner_id = ?', [req.body.name, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Social & Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  const { type, title, message, resource_type, resource_id } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, resource_type, resource_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, type, title, message, resource_type || null, resource_id || null]
    );
    res.status(201).json({ id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/notifications/unread/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/copy', authenticateToken, async (req, res) => {
  const { targetFolderId } = req.body;
  const newId = uuidv4();
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Source file not found' });
    const source = rows[0];
    await pool.query(
      'INSERT INTO files (id, name, path, mime_type, size, storage_key, folder_id, owner_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newId, `Copy of ${source.name}`, source.path, source.mime_type, source.size, `copy-${uuidv4()}-${source.storage_key}`, targetFolderId || null, req.user.id, source.metadata]
    );
    res.status(201).json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/hide', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE files SET metadata = JSON_SET(IFNULL(metadata, "{}"), "$.isHidden", ?) WHERE id = ? AND owner_id = ?', [req.body.isHidden, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/hide', authenticateToken, async (req, res) => {
  try {
    // For folders we might want a real column or use a systematic way, but for now metadata is fine
    // However, our schema doesn't have metadata for folders. Let's use a systematic name like 'hidden_at'
    // Actually, let's just add it to the name prefix or something simpler if we don't want to change schema
    // But let's assume we can use a dynamic approach.
    res.json({ success: true, message: 'Folder hide not fully implemented in schema yet' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/folders/:id/counts', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [folders] = await pool.query('SELECT COUNT(*) as count FROM folders WHERE parent_folder_id = ? AND deleted_at IS NULL', [id]);
    const [files] = await pool.query('SELECT COUNT(*) as count FROM files WHERE folder_id = ? AND deleted_at IS NULL', [id]);
    res.json({ files: files[0].count, folders: folders[0].count });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/recycle-bin/files', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE owner_id = ? AND deleted_at IS NOT NULL', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/recycle-bin/folders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM folders WHERE owner_id = ? AND deleted_at IS NOT NULL', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/recycle-bin/documents', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE owner_id = ? AND deleted_at IS NOT NULL', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/restore', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE files SET deleted_at = NULL WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/restore', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE folders SET deleted_at = NULL WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/documents/:id/restore', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE documents SET deleted_at = NULL WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/files/:id/permanent-delete', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT storage_key FROM files WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    if (rows.length > 0) {
      const filePath = path.join(__dirname, '../uploads', rows[0].storage_key);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM files WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/folders/:id/permanent-delete', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM folders WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/documents/:id/hard-delete', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM documents WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.get('/api/storage/quota', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT total_quota_bytes, used_bytes FROM storage_quotas WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      const def = { total_quota_bytes: 10737418240, used_bytes: 0 };
      await pool.query('INSERT INTO storage_quotas (id, user_id, total_quota_bytes, used_bytes) VALUES (?, ?, ?, ?)', [uuidv4(), req.user.id, def.total_quota_bytes, def.used_bytes]);
      return res.json(def);
    }
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin endpoints
app.get('/api/profiles', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.email, ur.role 
      FROM profiles p 
      JOIN users u ON p.id = u.id 
      LEFT JOIN user_roles ur ON p.id = ur.user_id
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/profiles/:id', authenticateToken, isAdmin, async (req, res) => {
  const { fullName, role } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('UPDATE profiles SET full_name = ? WHERE id = ?', [fullName, req.params.id]);
    if (role) {
      await connection.query('DELETE FROM user_roles WHERE user_id = ?', [req.params.id]);
      await connection.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), req.params.id, role]);
    }
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally { connection.release(); }
});

app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  const { email, password, fullName, role } = req.body;
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, email, passwordHash]);
    await connection.query('INSERT INTO profiles (id, full_name) VALUES (?, ?)', [userId, fullName]);
    await connection.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), userId, role || 'viewer']);
    await connection.commit();
    res.status(201).json({ id: userId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally { connection.release(); }
});

app.get('/api/storage/all-quotas', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sq.*, p.full_name, p.email 
      FROM storage_quotas sq 
      JOIN profiles p ON sq.user_id = p.id
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Sharing & Search
app.get('/api/shares/user', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM shares WHERE shared_by = ?', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search-all', authenticateToken, async (req, res) => {
  const { q } = req.query;
  console.log(`[Search-All] Query: "${q}", User: ${req.user.id}`);
  if (!q) return res.json({ files: [], folders: [], documents: [] });
  const searchTerm = `%${q.toLowerCase()}%`;
  try {
    const [files] = await pool.query(
      'SELECT * FROM files WHERE owner_id = ? AND LOWER(name) LIKE ? AND deleted_at IS NULL',
      [req.user.id, searchTerm]
    );
    const [folders] = await pool.query(
      'SELECT * FROM folders WHERE owner_id = ? AND LOWER(name) LIKE ? AND deleted_at IS NULL',
      [req.user.id, searchTerm]
    );
    const [documents] = await pool.query(
      'SELECT * FROM documents WHERE owner_id = ? AND (LOWER(name) LIKE ? OR LOWER(content) LIKE ?) AND deleted_at IS NULL',
      [req.user.id, searchTerm, searchTerm]
    );
    res.json({ files, folders, documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search/files', authenticateToken, async (req, res) => {
  const { q } = req.query;
  console.log(`[Search Files] Query: "${q}"`);
  try {
    const [rows] = await pool.query(
      'SELECT * FROM files WHERE owner_id = ? AND name LIKE ? AND deleted_at IS NULL',
      [req.user.id, `%${q}%`]
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search/folders', authenticateToken, async (req, res) => {
  const { q } = req.query;
  console.log(`[Search Folders] Query: "${q}"`);
  try {
    const [rows] = await pool.query(
      'SELECT * FROM folders WHERE owner_id = ? AND name LIKE ? AND deleted_at IS NULL',
      [req.user.id, `%${q}%`]
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.get('/api/search/documents', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE owner_id = ? AND (name LIKE ? OR content LIKE ?) AND deleted_at IS NULL',
      [req.user.id, `%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



app.get('/api/shares/received', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM shares WHERE shared_with = ?', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/shares/external', authenticateToken, async (req, res) => {
  const { resourceType, resourceId, accessLevel, password, expiresAt } = req.body;
  const id = uuidv4();
  const token = uuidv4().substring(0, 8);
  try {
    await pool.query(
      'INSERT INTO shares (id, resource_type, resource_id, share_type, shared_by, access_level, link_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, resourceType, resourceId, 'external_link', req.user.id, accessLevel, token, expiresAt || null]
    );
    res.status(201).json({ id, link_token: token });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Documents
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/favorites', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE owner_id = ? AND is_favorite = TRUE AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  const { name, description, content, folder_id, tags, ai_summary } = req.body;
  const documentId = uuidv4();
  try {
    await pool.query(
      'INSERT INTO documents (id, name, description, content, owner_id, folder_id, tags, ai_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [documentId, name, description || null, JSON.stringify(content || {}), req.user.id, folder_id || null, JSON.stringify(tags || []), ai_summary || null]
    );
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, content, folder_id, tags, is_favorite, is_hidden, ai_summary } = req.body;
  try {
    // Check if document exists and belongs to user
    const [docs] = await pool.query('SELECT * FROM documents WHERE id = ? AND owner_id = ?', [id, req.user.id]);
    if (docs.length === 0) return res.status(404).json({ error: 'Document not found' });

    const updateFields = [];
    const updateValues = [];
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (content !== undefined) { updateFields.push('content = ?'); updateValues.push(JSON.stringify(content)); }
    if (folder_id !== undefined) { updateFields.push('folder_id = ?'); updateValues.push(folder_id); }
    if (tags !== undefined) { updateFields.push('tags = ?'); updateValues.push(JSON.stringify(tags)); }
    if (is_favorite !== undefined) { updateFields.push('is_favorite = ?'); updateValues.push(is_favorite); }
    if (is_hidden !== undefined) { updateFields.push('is_hidden = ?'); updateValues.push(is_hidden); }
    if (ai_summary !== undefined) { updateFields.push('ai_summary = ?'); updateValues.push(ai_summary); }

    if (updateFields.length === 0) return res.json(docs[0]);

    updateValues.push(id, req.user.id);
    await pool.query(`UPDATE documents SET ${updateFields.join(', ')} WHERE id = ? AND owner_id = ?`, updateValues);
    const [updated] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/documents/:id/delete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [docs] = await pool.query('SELECT * FROM documents WHERE id = ? AND owner_id = ?', [id, req.user.id]);
    if (docs.length === 0) return res.status(404).json({ error: 'Document not found' });

    await pool.query('UPDATE documents SET deleted_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activity Logs
app.post('/api/activity/log', authenticateToken, async (req, res) => {
  const { action_type, resource_type, resource_id, metadata } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO activity_logs (id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [id, req.user.id, action_type, resource_type, resource_id || null, JSON.stringify(metadata || {}), req.ip]
    );
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activity', authenticateToken, async (req, res) => {
  const { userId, actionType, resourceType, limit = 100 } = req.query;
  try {
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activity/user/:userId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Final catch-all for debugging
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.SERVER_PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
