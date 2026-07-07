import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req, ctx, _session) => {
    const { id } = await ctx.params;
    const uid = Number(id);
    if (!Number.isInteger(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!user) throw ApiErrors.NotFound('User');

    const [itemCount, saleCount, mileageCount] = await Promise.all([
      db.select({ c: sql<number>`count(*)` }).from(items).where(eq(items.ownerId, uid)).get(),
      db.select({ c: sql<number>`count(*)` }).from(sales).where(eq(sales.soldBy, uid)).get(),
      db.select({ c: sql<number>`count(*)` }).from(mileage).where(eq(mileage.ownerId, uid)).get(),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        canViewAll: user.canViewAll,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      stats: {
        items: itemCount?.c ?? 0,
        sales: saleCount?.c ?? 0,
        mileage: mileageCount?.c ?? 0,
      },
    });
  }, { requireAdmin: true })(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const uid = Number(id);
    if (!Number.isInteger(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const target = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!target) throw ApiErrors.NotFound('User');

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const data = { ...parsed.data };
    // Admin cannot deactivate or change role of their own account.
    if (uid === sessionUserId(session)) {
      if (data.isActive === false) throw ApiErrors.BadRequest('You cannot deactivate your own account');
      if (data.role && data.role !== target.role) throw ApiErrors.BadRequest('You cannot change your own role');
    }

    // Email uniqueness check.
    if (data.email) {
      const existing = await db.query.users.findFirst({ where: eq(users.email, data.email.toLowerCase()) });
      if (existing && existing.id !== uid) throw ApiErrors.Conflict('Email already in use');
      data.email = data.email.toLowerCase();
    }

    const updated = db.update(users).set({ ...data, updatedAt: sql`(unixepoch())` }).where(eq(users.id, uid)).returning();
    return NextResponse.json({
      id: updated[0].id,
      email: updated[0].email,
      name: updated[0].name,
      role: updated[0].role,
      canViewAll: updated[0].canViewAll,
      isActive: updated[0].isActive,
    });
  }, { requireAdmin: true })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const uid = Number(id);
    if (!Number.isInteger(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');
    if (uid === sessionUserId(session)) throw ApiErrors.BadRequest('You cannot delete your own account');

    const target = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!target) throw ApiErrors.NotFound('User');

    const transferTo = req.nextUrl.searchParams.get('transferDataTo');
    const transferId = transferTo ? Number(transferTo) : null;

    if (transferId) {
      if (!Number.isInteger(transferId) || transferId <= 0) throw ApiErrors.BadRequest('Invalid transferDataTo');
      const recipient = await db.query.users.findFirst({ where: eq(users.id, transferId) });
      if (!recipient) throw ApiErrors.NotFound('Transfer target user');
      // Transfer ownership of items, sales, mileage.
      db.update(items).set({ ownerId: transferId }).where(eq(items.ownerId, uid)).run();
      db.update(sales).set({ soldBy: transferId }).where(eq(sales.soldBy, uid)).run();
      db.update(mileage).set({ ownerId: transferId }).where(eq(mileage.ownerId, uid)).run();
    }

    db.delete(users).where(eq(users.id, uid)).run();
    return NextResponse.json({ success: true });
  }, { requireAdmin: true })(req, ctx);
}
