import { z } from 'zod';
import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { eq } from 'drizzle-orm';
import { getRawDb } from './db';
import { nowTimestamp } from './utils';

// ─── Backup validation schemas ──────────────────────────────────────────────
const userRowSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  can_view_all: z.number().int().min(0).max(1),
  is_active: z.number().int().min(0).max(1),
  password_changed_at: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  created_by: z.number().int().nullable().optional(),
  last_login: z.number().int().nullable().optional(),
});

const itemRowSchema = z.object({
  id: z.number().int(),
  name: z.string().max(200),
  description: z.string().max(2000).nullable().optional(),
  purchase_date: z.number().int(),
  purchase_price: z.number().min(0),
  purchase_location: z.string().max(200).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: z.string().max(2000).nullable().optional(),
  removal_date: z.number().int().nullable().optional(),
  metadata: z.string().nullable().optional(),
  owner_id: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});

const saleRowSchema = z.object({
  id: z.number().int(),
  item_id: z.number().int().nullable().optional(),
  sold_date: z.number().int(),
  sold_price: z.number(),
  shipping_cost: z.number().nullable().optional(),
  shipping_collected: z.number().optional(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  sales_tax: z.number().nullable().optional(),
  platform_fees: z.number().optional(),
  refund_amount: z.number().optional(),
  refund_reason: z.string().nullable().optional(),
  refund_type: z.enum(['none', 'refund_no_return', 'refund_with_return']),
  sold_by: z.number().int(),
  created_at: z.number().int(),
});

const photoRowSchema = z.object({
  id: z.number().int(),
  item_id: z.number().int(),
  filename: z.string(),
  path: z.string(),
  is_primary: z.number().int().min(0).max(1),
  created_at: z.number().int(),
});

const mileageRowSchema = z.object({
  id: z.number().int(),
  date: z.number().int(),
  miles: z.number(),
  from_location: z.string().nullable().optional(),
  to_location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  owner_id: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});

const appConfigRowSchema = z.object({
  id: z.number().int(),
  company_name: z.string(),
  company_tagline: z.string(),
  sales_tax_rate: z.number().min(0).max(1),
  setup_complete: z.number().int().min(0).max(1),
  updated_at: z.number().int(),
});

export const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  tables: z.object({
    users: z.array(userRowSchema),
    items: z.array(itemRowSchema),
    sales: z.array(saleRowSchema),
    photos: z.array(photoRowSchema),
    mileage: z.array(mileageRowSchema),
    app_config: z.array(appConfigRowSchema),
  }),
});

export type BackupData = z.infer<typeof backupSchema>;

// ─── Export ──────────────────────────────────────────────────────────────────
export async function exportBackup(): Promise<BackupData> {
  const [allUsers, allItems, allSales, allPhotos, allMileage, allConfig] = await Promise.all([
    db.select().from(users),
    db.select().from(items),
    db.select().from(sales),
    db.select().from(photos),
    db.select().from(mileage),
    db.select().from(appConfig),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: {
      users: allUsers as unknown as BackupData['tables']['users'],
      items: allItems as unknown as BackupData['tables']['items'],
      sales: allSales as unknown as BackupData['tables']['sales'],
      photos: allPhotos as unknown as BackupData['tables']['photos'],
      mileage: allMileage as unknown as BackupData['tables']['mileage'],
      app_config: allConfig as unknown as BackupData['tables']['app_config'],
    },
  };
}

// ─── Restore ─────────────────────────────────────────────────────────────────
export interface RestoreResult {
  success: boolean;
  errors: string[];
}

export async function restoreBackup(data: unknown): Promise<RestoreResult> {
  const validation = backupSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const backup = validation.data;
  const sqlite = getRawDb();

  try {
    sqlite.exec('BEGIN');

    // Clear tables in dependency order
    sqlite.exec('DELETE FROM photos');
    sqlite.exec('DELETE FROM sales');
    sqlite.exec('DELETE FROM mileage');
    sqlite.exec('DELETE FROM items');
    sqlite.exec('DELETE FROM users');
    sqlite.exec('DELETE FROM app_config');

    // Insert in dependency order
    for (const row of backup.tables.app_config) {
      sqlite.prepare(
        'INSERT INTO app_config (id, company_name, company_tagline, sales_tax_rate, setup_complete, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.company_name, row.company_tagline, row.sales_tax_rate, row.setup_complete, row.updated_at);
    }
    for (const row of backup.tables.users) {
      sqlite.prepare(
        'INSERT INTO users (id, email, password_hash, name, role, can_view_all, is_active, password_changed_at, created_at, updated_at, created_by, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.email, row.password_hash, row.name, row.role, row.can_view_all, row.is_active, row.password_changed_at, row.created_at, row.updated_at, row.created_by ?? null, row.last_login ?? null);
    }
    for (const row of backup.tables.items) {
      sqlite.prepare(
        'INSERT INTO items (id, name, description, purchase_date, purchase_price, purchase_location, category, status, notes, removal_date, metadata, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.name, row.description ?? null, row.purchase_date, row.purchase_price, row.purchase_location ?? null, row.category ?? null, row.status, row.notes ?? null, row.removal_date ?? null, row.metadata ?? null, row.owner_id, row.created_at, row.updated_at);
    }
    for (const row of backup.tables.mileage) {
      sqlite.prepare(
        'INSERT INTO mileage (id, date, miles, from_location, to_location, address, vehicle, purpose, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.date, row.miles, row.from_location ?? null, row.to_location ?? null, row.address ?? null, row.vehicle ?? null, row.purpose ?? null, row.owner_id, row.created_at, row.updated_at);
    }
    for (const row of backup.tables.sales) {
      sqlite.prepare(
        'INSERT INTO sales (id, item_id, sold_date, sold_price, shipping_cost, shipping_collected, platform, sales_tax, platform_fees, refund_amount, refund_reason, refund_type, sold_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.item_id ?? null, row.sold_date, row.sold_price, row.shipping_cost ?? null, row.shipping_collected ?? 0, row.platform, row.sales_tax ?? null, row.platform_fees ?? 0, row.refund_amount ?? 0, row.refund_reason ?? null, row.refund_type, row.sold_by, row.created_at);
    }
    for (const row of backup.tables.photos) {
      sqlite.prepare(
        'INSERT INTO photos (id, item_id, filename, path, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(row.id, row.item_id, row.filename, row.path, row.is_primary, row.created_at);
    }

    sqlite.exec('COMMIT');
    return { success: true, errors: [] };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Restore failed';
    return { success: false, errors: [message] };
  }
}