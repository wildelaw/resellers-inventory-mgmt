import Database from 'better-sqlite3';
import { config } from '../lib/config';

function seedSettings() {
  const dbPath = config.database.path;
  const sqlite = new Database(dbPath);
  
  const existing = sqlite.prepare('SELECT id FROM app_config WHERE id = 1').get();
  
  if (!existing) {
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO app_config (id, company_name, company_tagline, sales_tax_rate, setup_complete, updated_at)
      VALUES (1, 'Resale Manager', '', 0.0825, 0, ?)
    `).run(now);
    console.log('Default settings created');
  } else {
    console.log('Settings already exist');
  }
  
  sqlite.close();
}

seedSettings();