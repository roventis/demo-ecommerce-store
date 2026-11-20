import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'demo.db');

export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables from schema if not present
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Auto-seed if database is fresh
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (!count || count.count === 0) {
    import('./seed.js').then(() => console.log('[DEMO DB] Auto-seeded fresh database')).catch(console.error);
  }
} catch (e) {
  console.warn('[DEMO DB] Auto-seed check error:', e.message);
}

export default db;
