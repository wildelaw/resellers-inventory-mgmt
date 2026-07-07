import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { eq, sql } from 'drizzle-orm';
import { backupSchema } from './validations';
import { nowTimestamp } from './utils';
import type { z } from 'zod';

type BackupData = z.infer<typeof backupSchema>;

/**
 * Export all tables as a JSON backup.
 */
export async function exportBackup(): Promise<BackupData> {
  const [allUsers, allItems, allSales, allPhotos, allMileage, allConfig] = await Promise.all([
    db.select().from(users).all(),
    db.select().from(items).all(),
    db.select().from(sales).all(),
    db.select().from(photos).all(),
    db.select().from(mileage).all(),
    db.select().from(appConfig).all(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: {
      users: allUsers as any,
      items: allItems as any,
      sales: allSales as any,
      photos: allPhotos as any,
      mileage: allMileage as any,
      app_config: allConfig as any,
    },
  };
}

/**
 * Validate backup data against Zod schemas.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
export function validateBackup(data: unknown): { valid: boolean; errors?: string[] } {
  const result = backupSchema.safeParse(data);
  if (result.success) {
    return { valid: true };
  }

  const errors = result.error.issues.map(issue =>
    `${issue.path.join('.')}: ${issue.message}`
  );

  return { valid: false, errors };
}

/**
 * Restore from a validated backup.
 * Clears all tables and inserts new data within a transaction.
 * All-or-nothing: if any insert fails, the transaction is rolled back.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  const sqlite = (db as any).session?.client ?? (db as any).$client;

  // Use raw transaction via better-sqlite3
  const { config: _config } = await import('./config');
  const Database = (await import('better-sqlite3')).default;
  const dbInstance = new Database(_config.database.path);
  dbInstance.pragma('foreign_keys = OFF');

  const txn = dbInstance.transaction(() => {
    // Clear tables in dependency order
    dbInstance.exec('DELETE FROM photos');
    dbInstance.exec('DELETE FROM sales');
    dbInstance.exec('DELETE FROM mileage');
    dbInstance.exec('DELETE FROM items');
    dbInstance.exec('DELETE FROM users');
    dbInstance.exec('DELETE FROM app_config');

    // Insert in dependency order: app_config → users → items → mileage → sales → photos
    for (const row of data.tables.app_config) {
      dbInstance.prepare(
        'INSERT INTO app_config (id, company_name, company_tagline, sales_tax_rate, setup_complete, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.company_name, row.company_tagline, row.sales_tax_rate, row.setup_complete ? 1 : 0, row.updated_at);
    }

    for (const row of data.tables.users) {
      dbInstance.prepare(
        'INSERT INTO users (id, email, password_hash, name, role, can_view_all, is_active, password_changed_at, created_at, updated_at, created_by, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.email, row.password_hash, row.name, row.role, row.can_view_all ? 1 : 0, row.is_active ? 1 : 0, row.password_changed_at, row.created_at, row.updated_at, row.created_by ?? null, row.last_login ?? null);
    }

    for (const row of data.tables.items) {
      dbInstance.prepare(
        'INSERT INTO items (id, name, description, purchase_date, purchase_price, purchase_location, category, status, notes, removal_date, metadata, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.name, row.description ?? null, row.purchase_date, row.purchase_price, row.purchase_location ?? null, row.category ?? null, row.status, row.notes ?? null, row.removal_date ?? null, row.metadata ?? null, row.owner_id, row.created_at, row.updated_at);
    }

    for (const row of data.tables.mileage) {
      dbInstance.prepare(
        'INSERT INTO mileage (id, date, miles, from_location, to_location, address, vehicle, purpose, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.date, row.miles, row.from_location ?? null, row.to_location ?? null, row.address ?? null, row.vehicle ?? null, row.purpose ?? null, row.owner_id, row.created_at, row.updated_at);
    }

    for (const row of data.tables.sales) {
      dbInstance.prepare(
        'INSERT INTO sales (id, item_id, sold_date, sold_price, shipping_cost, shipping_collected, platform, sales_tax, platform_fees, refund_amount, refund_reason, refund_type, sold_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.item_id ?? null, row.sold_date, row.sold_price, row.shipping_cost ?? null, row.shipping_collected ?? 0, row.platform, row.sales_tax ?? null, row.platform_fees ?? 0, row.refund_amount ?? 0, row.refund_reason ?? null, row.refund_type ?? 'none', row.sold_by, row.created_at);
    }

    for (const row of data.tables.photos) {
      dbInstance.prepare(
        'INSERT INTO photos (id, item_id, filename, path, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(row.id, row.item_id, row.filename, row.path, row.is_primary ? 1 : 0, row.created_at);
    }
  });

  try {
    txn();
  } finally {
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.close();
  }
}