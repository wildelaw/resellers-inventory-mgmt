import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { users, items, sales, photos, mileage, appConfig } from './schema';
import { ApiError, ApiErrors } from './api-errors';

// ---------------------------------------------------------------------------
// Backup validation schemas — dates may arrive as ISO strings or epoch numbers;
// booleans may arrive as true/false (JSON) or 0/1 (raw SQLite).
// ---------------------------------------------------------------------------

// Dates may arrive as ISO strings, epoch numbers, or live Date objects
// (an in-memory buildBackup() passed straight back to restoreBackup).
const dateField = z.union([z.string(), z.number(), z.date()]).transform((v, ctx) => {
  const d = new Date(v as never);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date' });
    return z.NEVER;
  }
  return d;
});

const boolField = z.union([z.boolean(), z.number()]).transform((v) => {
  if (typeof v === 'boolean') return v;
  return v !== 0;
});

const nullable = <T extends z.ZodTypeAny>(schema: T) => z.union([schema.nullable(), z.undefined()]);

const userRowSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().min(1).max(200),
  passwordHash: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user']),
  canViewAll: boolField,
  isActive: boolField,
  passwordChangedAt: z.number().int().min(0),
  createdAt: dateField,
  updatedAt: dateField,
  createdBy: z.number().int().positive().nullish(),
  lastLogin: nullable(dateField),
});

const itemRowSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: nullable(z.string().max(2000)),
  purchaseDate: dateField,
  purchasePrice: z.number().min(0),
  purchaseLocation: nullable(z.string().max(200)),
  category: nullable(z.string().max(100)),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: nullable(z.string().max(2000)),
  removalDate: nullable(dateField),
  metadata: nullable(z.string()),
  ownerId: z.number().int().positive(),
  createdAt: dateField,
  updatedAt: dateField,
});

const saleRowSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive().nullish(),
  soldDate: dateField,
  soldPrice: z.number().min(0),
  shippingCost: nullable(z.number().min(0)),
  shippingCollected: nullable(z.number().min(0)),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  salesTax: nullable(z.number().min(0)),
  platformFees: nullable(z.number().min(0)),
  refundAmount: nullable(z.number().min(0)),
  refundReason: nullable(z.string().max(500)),
  refundType: z.enum(['none', 'refund_no_return', 'refund_with_return']).nullish(),
  soldBy: z.number().int().positive(),
  createdAt: dateField,
});

const photoRowSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive(),
  filename: z.string().min(1),
  path: z.string().min(1),
  isPrimary: boolField,
  createdAt: dateField,
});

const mileageRowSchema = z.object({
  id: z.number().int().positive(),
  date: dateField,
  miles: z.number().min(0),
  fromLocation: nullable(z.string().max(200)),
  toLocation: nullable(z.string().max(200)),
  address: nullable(z.string().max(500)),
  vehicle: nullable(z.string().max(100)),
  purpose: nullable(z.string().max(200)),
  ownerId: z.number().int().positive(),
  createdAt: dateField,
  updatedAt: dateField,
});

const appConfigRowSchema = z.object({
  id: z.number().int().positive(),
  companyName: nullable(z.string().max(100)),
  companyTagline: nullable(z.string().max(200)),
  salesTaxRate: z.number().min(0).max(1).nullish(),
  setupComplete: boolField,
  updatedAt: dateField,
});

export const backupSchema = z.object({
  version: z.literal(2),
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

export type BackupFile = z.infer<typeof backupSchema>;

// ---------------------------------------------------------------------------
// Backup export
// ---------------------------------------------------------------------------

/** Exports every table for the JSON backup format. */
export async function buildBackup(): Promise<BackupFile> {
  const [userRows, itemRows, saleRows, photoRows, mileageRows, configRows] = await Promise.all([
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
      users: userRows,
      items: itemRows,
      sales: saleRows,
      photos: photoRows,
      mileage: mileageRows,
      app_config: configRows,
    },
  };
}

// ---------------------------------------------------------------------------
// Restore — validates ALL rows first (all-or-nothing), then restores in a
// single transaction.
// ---------------------------------------------------------------------------

export interface RestoreResult {
  restored: Record<string, number>;
}

export async function restoreBackup(input: unknown): Promise<RestoreResult> {
  // 1. Validate every row against the Zod schemas BEFORE touching the DB
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`
    );
    throw new ApiError(400, 'Backup validation failed', 'BAD_REQUEST', details.slice(0, 50));
  }

  const { users: userRows, items: itemRows, sales: saleRows, photos: photoRows, mileage: mileageRows, app_config: configRows } = parsed.data.tables;

  // Referential sanity checks (application-enforced FKs)
  const userIds = new Set(userRows.map((u) => u.id));
  const itemIds = new Set(itemRows.map((i) => i.id));
  const details: string[] = [];
  for (const i of itemRows) {
    if (!userIds.has(i.ownerId)) details.push(`Item ${i.id} references missing user ${i.ownerId}`);
  }
  for (const s of saleRows) {
    if (s.itemId != null && !itemIds.has(s.itemId)) details.push(`Sale ${s.id} references missing item ${s.itemId}`);
    if (!userIds.has(s.soldBy)) details.push(`Sale ${s.id} references missing user ${s.soldBy}`);
  }
  for (const p of photoRows) {
    if (!itemIds.has(p.itemId)) details.push(`Photo ${p.id} references missing item ${p.itemId}`);
  }
  for (const m of mileageRows) {
    if (!userIds.has(m.ownerId)) details.push(`Mileage ${m.id} references missing user ${m.ownerId}`);
  }
  if (details.length > 0) {
    throw new ApiError(400, 'Backup validation failed', 'BAD_REQUEST', details.slice(0, 50));
  }

  // 2. Restore inside a transaction — all-or-nothing. better-sqlite3
  // transactions are synchronous, so the callback must not be async.
  try {
    db.transaction((tx) => {
      // Clear tables in dependency order
      tx.delete(photos).run();
      tx.delete(sales).run();
      tx.delete(mileage).run();
      tx.delete(items).run();
      tx.delete(users).run();
      tx.delete(appConfig).run();

      // Insert rows in dependency order
      if (configRows.length > 0) {
        tx.insert(appConfig).values(configRows.map((r) => ({ ...r, updatedAt: r.updatedAt }))).run();
      } else {
        tx.insert(appConfig).values({ id: 1, updatedAt: new Date() }).run();
      }

      if (userRows.length > 0) {
        tx.insert(users).values(userRows).run();
      }
      if (itemRows.length > 0) {
        tx.insert(items).values(itemRows).run();
      }
      if (mileageRows.length > 0) {
        tx.insert(mileage).values(mileageRows).run();
      }
      if (saleRows.length > 0) {
        tx.insert(sales).values(saleRows.map((r) => ({ ...r, refundType: r.refundType ?? 'none' }))).run();
      }
      if (photoRows.length > 0) {
        tx.insert(photos).values(photoRows).run();
      }

      // Reset autoincrement counters so new rows don't collide with restored ids
      const maxIds: Array<[string, number]> = [
        ['users', Math.max(0, ...userRows.map((r) => r.id))],
        ['items', Math.max(0, ...itemRows.map((r) => r.id))],
        ['sales', Math.max(0, ...saleRows.map((r) => r.id))],
        ['photos', Math.max(0, ...photoRows.map((r) => r.id))],
        ['mileage', Math.max(0, ...mileageRows.map((r) => r.id))],
      ];
      for (const [name, maxId] of maxIds) {
        if (maxId > 0) {
          // sqlite_sequence has no unique constraint, so upsert via UPDATE
          // first and INSERT only when the row does not exist yet.
          const updated = tx.run(sql`UPDATE sqlite_sequence SET seq = ${maxId} WHERE name = ${name}`);
          if (Number(updated.changes) === 0) {
            tx.run(sql`INSERT INTO sqlite_sequence (name, seq) VALUES (${name}, ${maxId})`);
          }
        }
      }
      return null;
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Restore failed:', error);
    throw ApiErrors.BadRequest('Restore failed — no database changes were applied');
  }

  return {
    restored: {
      users: userRows.length,
      items: itemRows.length,
      sales: saleRows.length,
      photos: photoRows.length,
      mileage: mileageRows.length,
      app_config: configRows.length,
    },
  };
}