import { z } from 'zod/v4';
import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { eq } from 'drizzle-orm';

// ─── Backup format version ────────────────────────────────────────────
const BACKUP_VERSION = 2;

// ─── Zod validation schemas for each table ────────────────────────────
const userRowSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  password_hash: z.string().min(1),
  name: z.string().min(1).max(200),
  role: z.enum(['admin', 'user']),
  can_view_all: z.number().int().min(0).max(1),
  is_active: z.number().int().min(0).max(1),
  password_changed_at: z.number().int().min(0),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  created_by: z.number().int().nullable().optional(),
  last_login: z.number().int().nullable().optional(),
});

const itemRowSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  purchase_date: z.number().int(),
  purchase_price: z.number().positive(),
  purchase_location: z.string().max(200).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: z.string().max(2000).nullable().optional(),
  removal_date: z.number().int().nullable().optional(),
  metadata: z.string().nullable().optional(),
  owner_id: z.number().int().positive(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});

const saleRowSchema = z.object({
  id: z.number().int().positive(),
  item_id: z.number().int().positive().nullable().optional(),
  sold_date: z.number().int(),
  sold_price: z.number().positive(),
  shipping_cost: z.number().nullable().optional(),
  shipping_collected: z.number().min(0).nullable().optional().default(0),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  sales_tax: z.number().nullable().optional(),
  platform_fees: z.number().min(0).nullable().optional().default(0),
  refund_amount: z.number().min(0).nullable().optional().default(0),
  refund_reason: z.string().nullable().optional(),
  refund_type: z.enum(['none', 'refund_no_return', 'refund_with_return']).default('none'),
  sold_by: z.number().int().positive(),
  created_at: z.number().int(),
});

const photoRowSchema = z.object({
  id: z.number().int().positive(),
  item_id: z.number().int().positive(),
  filename: z.string().min(1),
  path: z.string().min(1),
  is_primary: z.number().int().min(0).max(1),
  created_at: z.number().int(),
});

const mileageRowSchema = z.object({
  id: z.number().int().positive(),
  date: z.number().int(),
  miles: z.number().positive(),
  from_location: z.string().max(200).nullable().optional(),
  to_location: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  vehicle: z.string().max(100).nullable().optional(),
  purpose: z.string().max(500).nullable().optional(),
  owner_id: z.number().int().positive(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});

const appConfigRowSchema = z.object({
  id: z.number().int().positive(),
  company_name: z.string().max(200).nullable().optional(),
  company_tagline: z.string().max(500).nullable().optional(),
  sales_tax_rate: z.number().min(0).max(1).nullable().optional(),
  setup_complete: z.number().int().min(0).max(1),
  updated_at: z.number().int(),
});

const backupSchema = z.object({
  version: z.literal(BACKUP_VERSION),
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

/**
 * Export all tables as a backup JSON object.
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
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      users: usersData as unknown as BackupData['tables']['users'],
      items: itemsData as unknown as BackupData['tables']['items'],
      sales: salesData as unknown as BackupData['tables']['sales'],
      photos: photosData as unknown as BackupData['tables']['photos'],
      mileage: mileageData as unknown as BackupData['tables']['mileage'],
      app_config: configData as unknown as BackupData['tables']['app_config'],
    },
  };
}

/**
 * Validate and restore a backup.
 * All-or-nothing: if any validation fails, no database changes occur.
 */
export async function restoreBackup(data: unknown): Promise<{ success: boolean; errors: string[] }> {
  // Validate all rows against Zod schemas
  const result = backupSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const backup = result.data;

  // Restore within a transaction — all-or-nothing
  try {
    await db.transaction(async (tx) => {
      // Clear tables in dependency order
      await tx.delete(photos);
      await tx.delete(sales);
      await tx.delete(mileage);
      await tx.delete(items);
      await tx.delete(users);
      await tx.delete(appConfig);

      // Insert rows in dependency order
      if (backup.tables.app_config.length > 0) {
        await tx.insert(appConfig).values(backup.tables.app_config as unknown as typeof appConfig.$inferInsert[]);
      }
      if (backup.tables.users.length > 0) {
        await tx.insert(users).values(backup.tables.users as unknown as typeof users.$inferInsert[]);
      }
      if (backup.tables.items.length > 0) {
        await tx.insert(items).values(backup.tables.items as unknown as typeof items.$inferInsert[]);
      }
      if (backup.tables.mileage.length > 0) {
        await tx.insert(mileage).values(backup.tables.mileage as unknown as typeof mileage.$inferInsert[]);
      }
      if (backup.tables.sales.length > 0) {
        await tx.insert(sales).values(backup.tables.sales as unknown as typeof sales.$inferInsert[]);
      }
      if (backup.tables.photos.length > 0) {
        await tx.insert(photos).values(backup.tables.photos as unknown as typeof photos.$inferInsert[]);
      }
    });

    return { success: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during restore';
    return { success: false, errors: [message] };
  }
}