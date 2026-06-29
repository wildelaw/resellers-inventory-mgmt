/**
 * Direct DB seeding helpers for functional/integration tests.
 */
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, items, sales, mileage, appConfig, fromBool, nowTs } from '@/lib/schema';
import type { UserRole } from '@/lib/constants';

export async function seedUser(opts: {
  email: string; password?: string; name?: string; role?: UserRole;
  canViewAll?: boolean; isActive?: boolean; passwordChangedAt?: number;
}): Promise<{ id: number; email: string; passwordHash: string }> {
  const password = opts.password || 'UserP@ss1';
  const passwordHash = await bcrypt.hash(password, 10);
  const ts = nowTs();
  const [u] = db.insert(users).values({
    email: opts.email,
    passwordHash,
    name: opts.name || opts.email.split('@')[0],
    role: opts.role || 'user',
    canViewAll: fromBool(opts.canViewAll ?? false),
    isActive: opts.isActive === false ? 0 : 1,
    passwordChangedAt: opts.passwordChangedAt ?? 0,
    createdAt: ts, updatedAt: ts,
  }).returning().all();
  return { id: u.id, email: u.email, passwordHash: u.passwordHash };
}

export function seedItem(opts: {
  ownerId: number; name?: string; purchasePrice?: number; status?: string;
  purchaseDate?: number; category?: string;
}): number {
  const ts = nowTs();
  const [it] = db.insert(items).values({
    name: opts.name || 'Test Item',
    purchaseDate: opts.purchaseDate ?? ts,
    purchasePrice: opts.purchasePrice ?? 10,
    status: (opts.status as never) || 'available',
    category: opts.category ?? null,
    ownerId: opts.ownerId,
    createdAt: ts, updatedAt: ts,
  }).returning().all();
  return it.id;
}

export function seedSale(opts: {
  itemId?: number | null; soldBy: number; soldPrice?: number; platform?: string;
  soldDate?: number; refundAmount?: number; refundType?: string;
}): number {
  const ts = nowTs();
  const [s] = db.insert(sales).values({
    itemId: opts.itemId ?? null,
    soldDate: opts.soldDate ?? ts,
    soldPrice: opts.soldPrice ?? 20,
    platform: (opts.platform as never) || 'local',
    shippingCollected: 0,
    platformFees: 0,
    refundAmount: opts.refundAmount ?? 0,
    refundType: (opts.refundType as never) || 'none',
    soldBy: opts.soldBy,
    createdAt: ts,
  }).returning().all();
  return s.id;
}

export function seedMileage(opts: { ownerId: number; miles?: number; date?: number }): number {
  const ts = nowTs();
  const [m] = db.insert(mileage).values({
    date: opts.date ?? ts,
    miles: opts.miles ?? 10,
    ownerId: opts.ownerId,
    createdAt: ts, updatedAt: ts,
  }).returning().all();
  return m.id;
}

export function lockSetup(): void {
  const ts = nowTs();
  const row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
  if (!row) db.insert(appConfig).values({ id: 1, setupComplete: 1, updatedAt: ts }).run();
  else db.update(appConfig).set({ setupComplete: 1, updatedAt: ts }).where(eq(appConfig.id, 1)).run();
}

export function getUser(id: number) {
  return db.query.users.findFirst({ where: eq(users.id, id) }).sync();
}
export function getItem(id: number) {
  return db.query.items.findFirst({ where: eq(items.id, id) }).sync();
}
export function getSale(id: number) {
  return db.query.sales.findFirst({ where: eq(sales.id, id) }).sync();
}