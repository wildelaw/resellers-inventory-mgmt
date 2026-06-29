import { db } from './db';
import {
  users, items, sales, photos, mileage, appConfig,
} from './schema';
import {
  backupFileSchema,
  type BackupFile,
} from './validations';
import { ApiErrors } from './api-errors';

export interface RestoreResult {
  counts: { users: number; items: number; sales: number; photos: number; mileage: number; app_config: number };
}

/**
 * Validate + restore a backup within a single transaction. All-or-nothing.
 * Tables are cleared in dependency order then re-inserted in dependency order.
 */
export async function restoreBackup(backup: unknown): Promise<RestoreResult> {
  // Validate the entire structure
  const parsed = backupFileSchema.safeParse(backup);
  if (!parsed.success) {
    throw ApiErrors.BadRequest('Backup validation failed', parsed.error.issues.map((i) => i.message));
  }
  const data: BackupFile = parsed.data;

  db.transaction(() => {
    // Clear in dependency order (children first)
    db.delete(photos).run();
    db.delete(sales).run();
    db.delete(mileage).run();
    db.delete(items).run();
    db.delete(users).run();
    db.delete(appConfig).run();

    // Insert in dependency order (parents first)
    if (data.tables.app_config.length > 0) {
      db.insert(appConfig).values(data.tables.app_config).run();
    }
    if (data.tables.users.length > 0) {
      db.insert(users).values(data.tables.users).run();
    }
    if (data.tables.items.length > 0) {
      db.insert(items).values(data.tables.items).run();
    }
    if (data.tables.mileage.length > 0) {
      db.insert(mileage).values(data.tables.mileage).run();
    }
    if (data.tables.sales.length > 0) {
      db.insert(sales).values(data.tables.sales).run();
    }
    if (data.tables.photos.length > 0) {
      db.insert(photos).values(data.tables.photos).run();
    }
  });

  return {
    counts: {
      users: data.tables.users.length,
      items: data.tables.items.length,
      sales: data.tables.sales.length,
      photos: data.tables.photos.length,
      mileage: data.tables.mileage.length,
      app_config: data.tables.app_config.length,
    },
  };
}

export function buildBackup(): BackupFile {
  const allUsers = db.select().from(users).all();
  const allItems = db.select().from(items).all();
  const allSales = db.select().from(sales).all();
  const allPhotos = db.select().from(photos).all();
  const allMileage = db.select().from(mileage).all();
  const allConfig = db.select().from(appConfig).all();

  // Normalize null -> undefined to satisfy optional Zod schema output type.
  const normalize = <T>(rows: T[]): unknown[] =>
    rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
        out[k] = v === null ? undefined : v;
      }
      return out;
    });

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: {
      users: normalize(allUsers) as BackupFile['tables']['users'],
      items: normalize(allItems) as BackupFile['tables']['items'],
      sales: normalize(allSales) as BackupFile['tables']['sales'],
      photos: normalize(allPhotos) as BackupFile['tables']['photos'],
      mileage: normalize(allMileage) as BackupFile['tables']['mileage'],
      app_config: normalize(allConfig) as BackupFile['tables']['app_config'],
    },
  };
}