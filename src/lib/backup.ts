import { z } from 'zod';
import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { eq, sql } from 'drizzle-orm';

// ─── Backup Validation Schemas ──────────────────────────────────────────────
const backupUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  can_view_all: z.number().int().min(0).max(1),
  is_active: z.number().int().min(0).max(1),
  password_changed_at: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
  created_by: z.number().nullable().optional(),
  last_login: z.number().nullable().optional(),
});

const backupItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  purchase_date: z.number(),
  purchase_price: z.number(),
  purchase_location: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: z.string().nullable().optional(),
  removal_date: z.number().nullable().optional(),
  metadata: z.string().nullable().optional(),
  owner_id: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

const backupSaleSchema = z.object({
  id: z.number(),
  item_id: z.number().nullable().optional(),
  sold_date: z.number(),
  sold_price: z.number(),
  shipping_cost: z.number().nullable().optional(),
  shipping_collected: z.number().nullable().optional(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  sales_tax: z.number().nullable().optional(),
  platform_fees: z.number().nullable().optional(),
  refund_amount: z.number().nullable().optional(),
  refund_reason: z.string().nullable().optional(),
  refund_type: z.enum(['none', 'refund_no_return', 'refund_with_return']).default('none'),
  sold_by: z.number(),
  created_at: z.number(),
});

const backupPhotoSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  filename: z.string(),
  path: z.string(),
  is_primary: z.number().int().min(0).max(1),
  created_at: z.number(),
});

const backupMileageSchema = z.object({
  id: z.number(),
  date: z.number(),
  miles: z.number(),
  from_location: z.string().nullable().optional(),
  to_location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  owner_id: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

const backupAppConfigSchema = z.object({
  id: z.number(),
  company_name: z.string().nullable().optional(),
  company_tagline: z.string().nullable().optional(),
  sales_tax_rate: z.number().min(0).max(1).nullable().optional(),
  setup_complete: z.number().int().min(0).max(1),
  updated_at: z.number(),
});

const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  tables: z.object({
    users: z.array(backupUserSchema),
    items: z.array(backupItemSchema),
    sales: z.array(backupSaleSchema),
    photos: z.array(backupPhotoSchema),
    mileage: z.array(backupMileageSchema),
    app_config: z.array(backupAppConfigSchema),
  }),
});

export type BackupData = z.infer<typeof backupSchema>;

/**
 * Validate backup data against schemas.
 * Returns validated data or validation errors.
 */
export function validateBackup(data: unknown): { success: true; data: BackupData } | { success: false; errors: string[] } {
  const result = backupSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

/**
 * Export all data as a backup object.
 */
export async function exportBackup(): Promise<BackupData> {
  const [usersData, itemsData, salesData, photosData, mileageData, configData] = await Promise.all([
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
      users: usersData as Record<string, unknown>[] as BackupData['tables']['users'],
      items: itemsData as Record<string, unknown>[] as BackupData['tables']['items'],
      sales: salesData as Record<string, unknown>[] as BackupData['tables']['sales'],
      photos: photosData as Record<string, unknown>[] as BackupData['tables']['photos'],
      mileage: mileageData as Record<string, unknown>[] as BackupData['tables']['mileage'],
      app_config: configData as Record<string, unknown>[] as BackupData['tables']['app_config'],
    },
  };
}

/**
 * Restore data from a validated backup.
 * All-or-nothing: if any operation fails, no database changes occur.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  // Clear and restore in dependency order within a transaction
  await db.transaction(async (tx) => {
    // Clear tables in reverse dependency order
    await tx.delete(photos);
    await tx.delete(sales);
    await tx.delete(mileage);
    await tx.delete(items);
    await tx.delete(users);
    await tx.delete(appConfig);

    // Insert in dependency order
    if (data.tables.app_config.length > 0) {
      await tx.insert(appConfig).values(data.tables.app_config as any[]);
    }
    if (data.tables.users.length > 0) {
      await tx.insert(users).values(data.tables.users as any[]);
    }
    if (data.tables.items.length > 0) {
      await tx.insert(items).values(data.tables.items as any[]);
    }
    if (data.tables.mileage.length > 0) {
      await tx.insert(mileage).values(data.tables.mileage as any[]);
    }
    if (data.tables.sales.length > 0) {
      await tx.insert(sales).values(data.tables.sales as any[]);
    }
    if (data.tables.photos.length > 0) {
      await tx.insert(photos).values(data.tables.photos as any[]);
    }
  });
}