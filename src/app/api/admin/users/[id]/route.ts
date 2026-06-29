import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { users, items, sales, mileage, fromBool, toBool, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

export const GET = withAuth(async (_req, ctx, _session) => {
  const { id } = await ctx.params;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const user = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
  if (!user) throw ApiErrors.NotFound('User');

  const itemCount = db.select({ c: sql<number>`COUNT(*)` }).from(items).where(eq(items.ownerId, uid)).get()?.c ?? 0;
  const saleCount = db.select({ c: sql<number>`COUNT(*)` }).from(sales).where(eq(sales.soldBy, uid)).get()?.c ?? 0;
  const mileageCount = db.select({ c: sql<number>`COUNT(*)` }).from(mileage).where(eq(mileage.ownerId, uid)).get()?.c ?? 0;

  return NextResponse.json({
    id: user.id, email: user.email, name: user.name, role: user.role,
    canViewAll: toBool(user.canViewAll), isActive: toBool(user.isActive),
    createdAt: user.createdAt, lastLogin: user.lastLogin,
    stats: { items: Number(itemCount), sales: Number(saleCount), mileage: Number(mileageCount) },
  });
}, { requireAdmin: true });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
  if (!existing) throw ApiErrors.NotFound('User');

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const me = currentUserId(session);

  // SEC-11: admin cannot deactivate or change role of their own account.
  if (uid === me) {
    if (data.isActive === false) throw ApiErrors.BadRequest('Cannot deactivate your own account');
    if (data.role !== undefined && data.role !== existing.role) {
      throw ApiErrors.BadRequest('Cannot change your own role');
    }
  }

  const update: Record<string, unknown> = { updatedAt: nowTs() };
  if (data.email !== undefined) update.email = data.email;
  if (data.name !== undefined) update.name = data.name;
  if (data.role !== undefined) update.role = data.role;
  if (data.canViewAll !== undefined) update.canViewAll = fromBool(data.canViewAll);
  if (data.isActive !== undefined) update.isActive = fromBool(data.isActive);

  const [updated] = db.update(users).set(update).where(eq(users.id, uid)).returning().all();
  return NextResponse.json({
    id: updated.id, email: updated.email, name: updated.name, role: updated.role,
    canViewAll: toBool(updated.canViewAll), isActive: toBool(updated.isActive),
  });
}, { requireAdmin: true });

export const DELETE = withAuth(async (req, ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
  if (!existing) throw ApiErrors.NotFound('User');

  const transferTo = parseInt(req.nextUrl.searchParams.get('transferDataTo') ?? '', 10);
  const transferId = Number.isFinite(transferTo) && transferTo > 0 ? transferTo : null;
  if (transferId !== null) {
    const target = db.query.users.findFirst({ where: eq(users.id, transferId) }).sync();
    if (!target) throw ApiErrors.BadRequest('transferDataTo target not found');
  }

  const sqlite = getRawDb();
  const tx = sqlite.transaction(() => {
    if (transferId !== null) {
      db.update(items).set({ ownerId: transferId }).where(eq(items.ownerId, uid)).run();
      db.update(sales).set({ soldBy: transferId }).where(eq(sales.soldBy, uid)).run();
      db.update(mileage).set({ ownerId: transferId }).where(eq(mileage.ownerId, uid)).run();
    } else {
      db.delete(mileage).where(eq(mileage.ownerId, uid)).run();
      db.delete(sales).where(eq(sales.soldBy, uid)).run();
      // delete items owned by the user (cascades photos + their sales)
      db.delete(items).where(eq(items.ownerId, uid)).run();
    }
    db.delete(users).where(eq(users.id, uid)).run();
  });
  tx();

  return NextResponse.json({ success: true });
}, { requireAdmin: true });