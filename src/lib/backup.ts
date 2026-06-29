/**
 * Backup/restore: Zod validation schemas for all 6 tables plus atomic restore.
 *
 * Restore process:
 *  1. Validate every row in every table against Zod schemas (all-or-nothing).
 *  2. If any validation fails, return the errors — NO database changes.
 *  3. Begin transaction; clear tables in dependency order; insert in order; commit.
 */
import { z } from 'zod';
import { db, getRawDb } from './db';
import { users, items, sales, photos, mileage, appConfig, toBool, fromBool, nowTs } from './schema';
import {
  backupUserSchema, backupItemSchema, backupSaleSchema, backupPhotoSchema,
  backupMileageSchema, backupAppConfigSchema,
} from './validations';

export const BACKUP_VERSION = 2;

export interface BackupPayload {
  version: number;
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

/** Build the backup payload from the current database. */
export async function buildBackup(): Promise<BackupPayload> {
  const [u, i, s, p, m, c] = await Promise.all([
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
    tables: { users: u, items: i, sales: s, photos: p, mileage: m, app_config: c },
  };
}

export interface RestoreResult {
  counts: { users: number; items: number; sales: number; photos: number; mileage: number; app_config: number };
}

export interface RestoreValidationError {
  error: string;
  table: string;
  rowIndex: number | null;
  details: unknown[];
}

const SCHEMAS = {
  users: backupUserSchema,
  items: backupItemSchema,
  sales: backupSaleSchema,
  photos: backupPhotoSchema,
  mileage: backupMileageSchema,
  app_config: backupAppConfigSchema,
} as const;

/**
 * Validate a backup payload. Returns null if valid, or a list of validation errors.
 * No database changes occur during validation.
 */
export function validateBackup(payload: unknown): RestoreValidationError[] | null {
  const errors: RestoreValidationError[] = [];
  if (!payload || typeof payload !== 'object') {
    return [{ error: 'Invalid backup payload', table: '', rowIndex: null, details: ['Expected an object'] }];
  }
  const p = payload as Partial<BackupPayload>;
  if (p.version !== BACKUP_VERSION) {
    errors.push({ error: 'Unsupported backup version', table: '', rowIndex: null, details: [`Expected version ${BACKUP_VERSION}, got ${p.version}`] });
  }
  if (!p.tables) {
    errors.push({ error: 'Missing tables', table: '', rowIndex: null, details: [] });
    return errors;
  }

  for (const [table, schema] of Object.entries(SCHEMAS) as [keyof typeof SCHEMAS, z.ZodType][]) {
    const rows = (p.tables as Record<string, unknown[]>)[table] ?? [];
    rows.forEach((row, idx) => {
      const r = schema.safeParse(row);
      if (!r.success) {
        errors.push({ error: `Invalid row in ${table}`, table, rowIndex: idx, details: r.error.issues.map((i) => i.message) });
      }
    });
  }

  return errors.length === 0 ? null : errors;
}

/** Coerce validated row objects back into the shapes expected by drizzle insert. */
function coerceUser(row: z.infer<typeof backupUserSchema>) {
  return {
    id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name,
    role: row.role, canViewAll: fromBool(toBool(row.canViewAll)), isActive: fromBool(toBool(row.isActive)),
    passwordChangedAt: row.passwordChangedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? null, lastLogin: row.lastLogin ?? null,
  };
}
function coerceItem(row: z.infer<typeof backupItemSchema>) {
  return {
    id: row.id, name: row.name, description: row.description ?? null, purchaseDate: row.purchaseDate,
    purchasePrice: row.purchasePrice, purchaseLocation: row.purchaseLocation ?? null,
    category: row.category ?? null, status: row.status, notes: row.notes ?? null,
    removalDate: row.removalDate ?? null, metadata: row.metadata ?? null, ownerId: row.ownerId,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
function coerceSale(row: z.infer<typeof backupSaleSchema>) {
  return {
    id: row.id, itemId: row.itemId ?? null, soldDate: row.soldDate, soldPrice: row.soldPrice,
    shippingCost: row.shippingCost ?? null, shippingCollected: row.shippingCollected ?? 0,
    platform: row.platform, salesTax: row.salesTax ?? null, platformFees: row.platformFees ?? 0,
    refundAmount: row.refundAmount ?? 0, refundReason: row.refundReason ?? null,
    refundType: row.refundType ?? 'none', soldBy: row.soldBy, createdAt: row.createdAt,
  };
}
function coercePhoto(row: z.infer<typeof backupPhotoSchema>) {
  return {
    id: row.id, itemId: row.itemId, filename: row.filename, path: row.path,
    isPrimary: fromBool(toBool(row.isPrimary)), createdAt: row.createdAt,
  };
}
function coerceMileage(row: z.infer<typeof backupMileageSchema>) {
  return {
    id: row.id, date: row.date, miles: row.miles, fromLocation: row.fromLocation ?? null,
    toLocation: row.toLocation ?? null, address: row.address ?? null, vehicle: row.vehicle ?? null,
    purpose: row.purpose ?? null, ownerId: row.ownerId, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
function coerceAppConfig(row: z.infer<typeof backupAppConfigSchema>) {
  return {
    id: row.id, companyName: row.companyName, companyTagline: row.companyTagline,
    salesTaxRate: row.salesTaxRate, setupComplete: fromBool(toBool(row.setupComplete)), updatedAt: row.updatedAt,
  };
}

/**
 * Restore a validated backup atomically. Caller must have run validateBackup first.
 */
export async function restoreBackup(payload: BackupPayload): Promise<RestoreResult> {
  const sqlite = getRawDb();
  const counts = { users: 0, items: 0, sales: 0, photos: 0, mileage: 0, app_config: 0 };

  const tx = sqlite.transaction(() => {
    // Clear in dependency order (children first).
    db.delete(photos).run();
    db.delete(sales).run();
    db.delete(mileage).run();
    db.delete(items).run();
    db.delete(users).run();
    db.delete(appConfig).run();

    // Insert in dependency order (parents first).
    for (const row of payload.tables.app_config) {
      db.insert(appConfig).values(coerceAppConfig(row as z.infer<typeof backupAppConfigSchema>)).run();
      counts.app_config++;
    }
    for (const row of payload.tables.users) {
      db.insert(users).values(coerceUser(row as z.infer<typeof backupUserSchema>)).run();
      counts.users++;
    }
    for (const row of payload.tables.items) {
      db.insert(items).values(coerceItem(row as z.infer<typeof backupItemSchema>)).run();
      counts.items++;
    }
    for (const row of payload.tables.mileage) {
      db.insert(mileage).values(coerceMileage(row as z.infer<typeof backupMileageSchema>)).run();
      counts.mileage++;
    }
    for (const row of payload.tables.sales) {
      db.insert(sales).values(coerceSale(row as z.infer<typeof backupSaleSchema>)).run();
      counts.sales++;
    }
    for (const row of payload.tables.photos) {
      db.insert(photos).values(coercePhoto(row as z.infer<typeof backupPhotoSchema>)).run();
      counts.photos++;
    }
    // Ensure single-row invariant.
    db.insert(appConfig).values({ id: 1, updatedAt: nowTs() }).onConflictDoNothing().run();
  });

  tx();
  // Reset auto-sequence counters so new inserts continue past restored ids.
  resetSequences();
  return { counts };
}

/** Bump SQLite autoincrement sequences past the max restored id per table. */
function resetSequences(): void {
  const sqlite = getRawDb();
  const tables = ['users', 'items', 'sales', 'photos', 'mileage'];
  for (const t of tables) {
    const row = sqlite.prepare(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${t}`).get() as { max_id: number };
    const maxId = row?.max_id ?? 0;
    sqlite.exec(`UPDATE sqlite_sequence SET seq = ${maxId} WHERE name = '${t}';`);
  }
}