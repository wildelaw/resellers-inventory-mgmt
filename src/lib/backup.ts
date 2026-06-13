import { z } from 'zod';
import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { eq } from 'drizzle-orm';

const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  name: z.string().min(1).max(200),
  role: z.enum(['admin', 'user']),
  canViewAll: z.boolean(),
  isActive: z.boolean(),
  passwordChangedAt: z.number().int(),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]),
  createdBy: z.number().int().positive().optional().nullable(),
  lastLogin: z.union([z.string(), z.number()]).optional().nullable(),
});

const itemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]),
  purchasePrice: z.number().positive(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: z.string().max(2000).optional().nullable(),
  removalDate: z.union([z.string(), z.number()]).optional().nullable(),
  metadata: z.any().optional().nullable(),
  ownerId: z.number().int().positive(),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]),
});

const saleSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: z.union([z.string(), z.number()]),
  soldPrice: z.number(),
  shippingCost: z.number().optional().nullable(),
  shippingCollected: z.number().optional().nullable(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  salesTax: z.number().optional().nullable(),
  platformFees: z.number().optional().nullable(),
  refundAmount: z.number().optional().nullable(),
  refundReason: z.string().optional().nullable(),
  refundType: z.enum(['none', 'refund_no_return', 'refund_with_return']),
  soldBy: z.number().int().positive(),
  createdAt: z.union([z.string(), z.number()]),
});

const photoSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive(),
  filename: z.string().min(1),
  path: z.string().min(1),
  isPrimary: z.boolean(),
  createdAt: z.union([z.string(), z.number()]),
});

const mileageSchema = z.object({
  id: z.number().int().positive(),
  date: z.union([z.string(), z.number()]),
  miles: z.number().positive(),
  fromLocation: z.string().optional().nullable(),
  toLocation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vehicle: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  ownerId: z.number().int().positive(),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()]),
});

const appConfigSchema = z.object({
  id: z.number().int().positive(),
  companyName: z.string().optional().nullable(),
  companyTagline: z.string().optional().nullable(),
  salesTaxRate: z.number().min(0).max(1).optional().nullable(),
  setupComplete: z.boolean(),
  updatedAt: z.union([z.string(), z.number()]),
});

export const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  tables: z.object({
    users: z.array(userSchema),
    items: z.array(itemSchema),
    sales: z.array(saleSchema),
    photos: z.array(photoSchema),
    mileage: z.array(mileageSchema),
    app_config: z.array(appConfigSchema),
  }),
});

export type BackupData = z.infer<typeof backupSchema>;

export function validateBackup(data: unknown): { valid: boolean; errors: string[] } {
  const result = backupSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}

export async function exportBackup(): Promise<BackupData> {
  const allUsers = await db.select().from(users);
  const allItems = await db.select().from(items);
  const allSales = await db.select().from(sales);
  const allPhotos = await db.select().from(photos);
  const allMileage = await db.select().from(mileage);
  const allConfig = await db.select().from(appConfig);

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

export async function restoreBackup(data: BackupData): Promise<void> {
  await db.delete(photos);
  await db.delete(sales);
  await db.delete(mileage);
  await db.delete(items);
  await db.delete(users);
  await db.delete(appConfig);

  for (const configRow of data.tables.app_config) {
    await db.insert(appConfig).values(configRow as any);
  }
  for (const user of data.tables.users) {
    await db.insert(users).values(user as any);
  }
  for (const item of data.tables.items) {
    await db.insert(items).values(item as any);
  }
  for (const entry of data.tables.mileage) {
    await db.insert(mileage).values(entry as any);
  }
  for (const sale of data.tables.sales) {
    await db.insert(sales).values(sale as any);
  }
  for (const photo of data.tables.photos) {
    await db.insert(photos).values(photo as any);
  }
}