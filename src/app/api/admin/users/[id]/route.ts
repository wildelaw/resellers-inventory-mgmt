import { NextResponse, type NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

const USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  canViewAll: users.canViewAll,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLogin: users.lastLogin,
};

async function getUserOr404(id: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) throw ApiErrors.NotFound('User');
  return user;
}

// GET /api/admin/users/:id — user details + stats
export const GET = withAuth(async (req, ctx, session) => {
  const { id } = await ctx!.params;
  const user = await getUserOr404(Number(id));

  const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(items).where(eq(items.ownerId, user.id));
  const [saleCount] = await db.select({ count: sql<number>`count(*)` }).from(sales).where(eq(sales.soldBy, user.id));
  const [mileageCount] = await db.select({ count: sql<number>`count(*)` }).from(mileage).where(eq(mileage.ownerId, user.id));

  const { passwordHash, ...safe } = user;
  return NextResponse.json({
    user: safe,
    stats: {
      items: Number(itemCount.count),
      sales: Number(saleCount.count),
      mileage: Number(mileageCount.count),
    },
  });
}, { requireAdmin: true });

// PUT /api/admin/users/:id — update email, name, role, canViewAll, isActive
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const userId = Number(id);
  const user = await getUserOr404(userId);

  const body = await readJsonBody(req);
  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const data = { ...validation.data };

  // Admin cannot deactivate or change the role of their own account
  if (userId === Number(session.user.id)) {
    if (data.isActive === false) {
      throw ApiErrors.BadRequest('You cannot deactivate your own account');
    }
    if (data.role && data.role !== user.role) {
      throw ApiErrors.BadRequest('You cannot change your own role');
    }
  }

  if (data.email && data.email !== user.email) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, data.email.toLowerCase()) });
    if (existing && existing.id !== userId) throw ApiErrors.Conflict('A user with this email already exists');
  }

  const updated = await db.update(users).set({
    ...data,
    ...(data.email ? { email: data.email.toLowerCase() } : {}),
    updatedAt: new Date(),
  }).where(eq(users.id, userId)).returning(USER_COLUMNS);

  return NextResponse.json(updated[0]);
}, { requireAdmin: true });

// DELETE /api/admin/users/:id?transferDataTo=5 — delete user, optionally
// transferring their data to another user (transactional)
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const userId = Number(id);
  const user = await getUserOr404(userId);

  if (userId === Number(session.user.id)) {
    throw ApiErrors.BadRequest('You cannot delete your own account');
  }

  const transferParam = req.nextUrl.searchParams.get('transferDataTo');
  let transferTo: number | null = null;
  if (transferParam) {
    transferTo = Number(transferParam);
    const target = await db.query.users.findFirst({ where: eq(users.id, transferTo) });
    if (!target) throw ApiErrors.NotFound('Transfer target user');
    if (target.id === userId) throw ApiErrors.BadRequest('Cannot transfer data to the user being deleted');
  }

  db.transaction((tx) => {
    if (transferTo != null) {
      tx.update(items).set({ ownerId: transferTo }).where(eq(items.ownerId, userId)).run();
      tx.update(mileage).set({ ownerId: transferTo }).where(eq(mileage.ownerId, userId)).run();
      tx.update(sales).set({ soldBy: transferTo }).where(eq(sales.soldBy, userId)).run();
    } else {
      // No transfer target: delete the user's data (sales cascade from items)
      tx.delete(sales).where(eq(sales.soldBy, userId)).run();
      tx.delete(mileage).where(eq(mileage.ownerId, userId)).run();
      tx.delete(items).where(eq(items.ownerId, userId)).run();
    }
    tx.delete(users).where(eq(users.id, userId)).run();
    return null;
  });

  return NextResponse.json({
    success: true,
    transferred: transferTo != null,
  });
}, { requireAdmin: true });