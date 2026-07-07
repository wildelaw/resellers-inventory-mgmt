import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import {
  backupFileSchema,
  type backupUserSchema as _bUs,
} from './validations';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';

export interface BackupPayload {
  version: 2;
  exportedAt: string;
  tables: {
    users: unknown[];
    items: unknown[];
    sales: unknown[];
    photos: unknown[];
    mileage: unknown[];
    app_config: unknown[];
  };
}

/**
 * Export all tables as a JSON-serializable backup payload.
 * Password hashes are included (the backup is admin-only and intended for restore).
 */
export async function exportBackup(): Promise<BackupPayload> {
  const [u, i, s, p, m, c] = await Promise.all([
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
      users: u,
      items: i,
      sales: s,
      photos: p,
      mileage: m,
      app_config: c,
    },
  };
}

type BackupFile = z.infer<typeof backupFileSchema>;

/**
 * Validate a backup payload against the Zod backup schemas.
 * Returns the parsed payload or throws with a list of validation errors.
 */
export function validateBackup(raw: unknown): BackupFile {
  const result = backupFileSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    );
    throw new Error(`Backup validation failed: ${messages.join('; ')}`);
  }
  return result.data;
}

/**
 * Restore a validated backup within a single transaction.
 * Tables are cleared in dependency order then re-inserted in dependency order.
 * All-or-nothing: if any insert fails the transaction rolls back.
 */
export async function restoreBackup(data: BackupFile): Promise<void> {
  const sqlite = (await import('./db')).getSqlite();

  const txn = sqlite.transaction(() => {
    // Clear in dependency order (children first).
    sqlite.exec('DELETE FROM photos;');
    sqlite.exec('DELETE FROM sales;');
    sqlite.exec('DELETE FROM mileage;');
    sqlite.exec('DELETE FROM items;');
    sqlite.exec('DELETE FROM users;');
    sqlite.exec('DELETE FROM app_config;');

    // Insert in dependency order (parents first).
    for (const row of data.tables.app_config) {
      sqlite
        .prepare(
          'INSERT INTO app_config (id, company_name, company_tagline, sales_tax_rate, setup_complete, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.companyName,
          row.companyTagline,
          row.salesTaxRate,
          row.setupComplete ? 1 : 0,
          row.updatedAt,
        );
    }

    for (const row of data.tables.users) {
      sqlite
        .prepare(
          'INSERT INTO users (id, email, password_hash, name, role, can_view_all, is_active, password_changed_at, created_at, updated_at, created_by, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.email,
          row.passwordHash,
          row.name,
          row.role,
          row.canViewAll ? 1 : 0,
          row.isActive ? 1 : 0,
          row.passwordChangedAt,
          row.createdAt,
          row.updatedAt,
          row.createdBy ?? null,
          row.lastLogin ?? null,
        );
    }

    for (const row of data.tables.items) {
      const meta = row.metadata !== null && row.metadata !== undefined ? JSON.stringify(row.metadata) : null;
      sqlite
        .prepare(
          'INSERT INTO items (id, name, description, purchase_date, purchase_price, purchase_location, category, status, notes, removal_date, metadata, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.name,
          row.description ?? null,
          row.purchaseDate,
          row.purchasePrice,
          row.purchaseLocation ?? null,
          row.category ?? null,
          row.status,
          row.notes ?? null,
          row.removalDate ?? null,
          meta,
          row.ownerId,
          row.createdAt,
          row.updatedAt,
        );
    }

    for (const row of data.tables.mileage) {
      sqlite
        .prepare(
          'INSERT INTO mileage (id, date, miles, from_location, to_location, address, vehicle, purpose, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.date,
          row.miles,
          row.fromLocation ?? null,
          row.toLocation ?? null,
          row.address ?? null,
          row.vehicle ?? null,
          row.purpose ?? null,
          row.ownerId,
          row.createdAt,
          row.updatedAt,
        );
    }

    for (const row of data.tables.sales) {
      sqlite
        .prepare(
          'INSERT INTO sales (id, item_id, sold_date, sold_price, shipping_cost, shipping_collected, platform, sales_tax, platform_fees, refund_amount, refund_reason, refund_type, sold_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.itemId ?? null,
          row.soldDate,
          row.soldPrice,
          row.shippingCost ?? null,
          row.shippingCollected ?? null,
          row.platform,
          row.salesTax ?? null,
          row.platformFees ?? null,
          row.refundAmount ?? null,
          row.refundReason ?? null,
          row.refundType,
          row.soldBy,
          row.createdAt,
        );
    }

    for (const row of data.tables.photos) {
      sqlite
        .prepare(
          'INSERT INTO photos (id, item_id, filename, path, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          row.id,
          row.itemId,
          row.filename,
          row.path,
          row.isPrimary ? 1 : 0,
          row.createdAt,
        );
    }
  });

  txn();
}
