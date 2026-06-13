import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { config } from '../lib/config';

async function seed() {
  const dbPath = config.database.path;
  const sqlite = new Database(dbPath);
  
  const existingUser = sqlite.prepare('SELECT id FROM users WHERE email = ?').get('security@lawsonsoft.com');
  
  if (existingUser) {
    console.log('Admin user already exists');
    sqlite.close();
    return;
  }
  
  const passwordHash = await bcrypt.hash('AdminP@ss1', 10);
  const now = Math.floor(Date.now() / 1000);
  
  sqlite.prepare(`
    INSERT INTO users (email, password_hash, name, role, can_view_all, is_active, password_changed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'security@lawsonsoft.com',
    passwordHash,
    'Admin User',
    'admin',
    1,
    1,
    0,
    now,
    now
  );
  
  const configExists = sqlite.prepare('SELECT id FROM app_config WHERE id = 1').get();
  if (!configExists) {
    sqlite.prepare(`
      INSERT INTO app_config (id, company_name, company_tagline, sales_tax_rate, setup_complete, updated_at)
      VALUES (1, 'Resale Manager', '', 0.0825, 1, ?)
    `).run(now);
  } else {
    sqlite.prepare('UPDATE app_config SET setup_complete = 1, updated_at = ? WHERE id = 1').run(now);
  }
  
  console.log('Admin user created successfully');
  sqlite.close();
}

seed().catch(console.error);