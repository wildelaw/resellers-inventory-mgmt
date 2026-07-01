import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import {
  backupSchema,
  backupUserSchema,
  backupItemSchema,
  backupSaleSchema,
  backupPhotoSchema,
  backupMileageSchema,
  backupAppConfigSchema,
} from './validations';
import type { z } from 'zod';

export type BackupData = z.infer<typeof backupSchema>;

/**
 * Export all data as a backup
 */
export async function exportBackup(): Promise<BackupData> {
  const [
    usersData,
    itemsData,
    salesData,
    photosData,
    mileageData,
    appConfigData,
  ] = await Promise.all([
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
      users: usersData.map(u => ({
        ...u,
        createdAt: new Date(u.createdAt).getTime(),
        updatedAt: new Date(u.updatedAt).getTime(),
        lastLogin: u.lastLogin ? new Date(u.lastLogin).getTime() : null,
        passwordChangedAt: u.passwordChangedAt ? new Date(u.passwordChangedAt).getTime() : 0,
      })),
      items: itemsData.map(i => ({
        ...i,
        purchaseDate: new Date(i.purchaseDate).getTime(),
        removalDate: i.removalDate ? new Date(i.removalDate).getTime() : null,
        createdAt: new Date(i.createdAt).getTime(),
        updatedAt: new Date(i.updatedAt).getTime(),
        metadata: i.metadata ? JSON.stringify(i.metadata) : null,
      })),
      sales: salesData.map(s => ({
        ...s,
        soldDate: new Date(s.soldDate).getTime(),
        createdAt: new Date(s.createdAt).getTime(),
      })),
      photos: photosData.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt).getTime(),
      })),
      mileage: mileageData.map(m => ({
        ...m,
        date: new Date(m.date).getTime(),
        createdAt: new Date(m.createdAt).getTime(),
        updatedAt: new Date(m.updatedAt).getTime(),
      })),
      app_config: appConfigData.map(c => ({
        ...c,
        updatedAt: new Date(c.updatedAt).getTime(),
      })),
    },
  };
}

/**
 * Validate backup data against schemas
 */
export function validateBackup(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate overall structure
  const backupValidation = backupSchema.safeParse(data);
  if (!backupValidation.success) {
    backupValidation.error.issues.forEach(issue => {
      errors.push(`Backup structure: ${issue.path.join('.')}: ${issue.message}`);
    });
    return { valid: false, errors };
  }

  // Validate each table
  const tables = data.tables;

  // Validate users
  tables.users?.forEach((user: any, index: number) => {
    const validation = backupUserSchema.safeParse(user);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`User ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  // Validate items
  tables.items?.forEach((item: any, index: number) => {
    const validation = backupItemSchema.safeParse(item);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`Item ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  // Validate sales
  tables.sales?.forEach((sale: any, index: number) => {
    const validation = backupSaleSchema.safeParse(sale);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`Sale ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  // Validate photos
  tables.photos?.forEach((photo: any, index: number) => {
    const validation = backupPhotoSchema.safeParse(photo);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`Photo ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  // Validate mileage
  tables.mileage?.forEach((entry: any, index: number) => {
    const validation = backupMileageSchema.safeParse(entry);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`Mileage ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  // Validate app_config
  tables.app_config?.forEach((config: any, index: number) => {
    const validation = backupAppConfigSchema.safeParse(config);
    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        errors.push(`Config ${index + 1}: ${issue.path.join('.')}: ${issue.message}`);
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Restore data from backup
 * All-or-nothing: if any validation fails, no database changes occur
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  // Validate first
  const validation = validateBackup(data);
  if (!validation.valid) {
    throw new Error(`Backup validation failed: ${validation.errors.join('; ')}`);
  }

  // Perform restore in a transaction
  await db.transaction(async (tx) => {
    // Delete in dependency order (children first)
    await tx.delete(photos);
    await tx.delete(sales);
    await tx.delete(mileage);
    await tx.delete(items);
    await tx.delete(users);
    await tx.delete(appConfig);

    // Insert in dependency order (parents first)
    
    // App config
    if (data.tables.app_config.length > 0) {
      await tx.insert(appConfig).values(
        data.tables.app_config.map(c => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
        }))
      );
    }

    // Users
    if (data.tables.users.length > 0) {
      await tx.insert(users).values(
        data.tables.users.map(u => ({
          ...u,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
          passwordChangedAt: u.passwordChangedAt ? new Date(u.passwordChangedAt) : new Date(0),
        }))
      );
    }

    // Items
    if (data.tables.items.length > 0) {
      await tx.insert(items).values(
        data.tables.items.map(i => ({
          ...i,
          purchaseDate: new Date(i.purchaseDate),
          removalDate: i.removalDate ? new Date(i.removalDate) : null,
          createdAt: new Date(i.createdAt),
          updatedAt: new Date(i.updatedAt),
          metadata: i.metadata ? JSON.parse(i.metadata) : null,
        }))
      );
    }

    // Mileage
    if (data.tables.mileage.length > 0) {
      await tx.insert(mileage).values(
        data.tables.mileage.map(m => ({
          ...m,
          date: new Date(m.date),
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        }))
      );
    }

    // Sales
    if (data.tables.sales.length > 0) {
      await tx.insert(sales).values(
        data.tables.sales.map(s => ({
          ...s,
          soldDate: new Date(s.soldDate),
          createdAt: new Date(s.createdAt),
        }))
      );
    }

    // Photos
    if (data.tables.photos.length > 0) {
      await tx.insert(photos).values(
        data.tables.photos.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }))
      );
    }
  });
}
