import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: String(u.id),
    email: u.email,
    name: u.name,
    role: u.role,
    canViewAll: u.canViewAll,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  };
}

// GET /api/admin/users/[id] — user details + stats
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, _session) => {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return ApiErrors.NotFound('User').toResponse();
    const [itemCount, saleCount, mileageCount] = await Promise.all([
      db.$count(items, eq(items.ownerId, id)),
      db.$count(sales, eq(sales.soldBy, id)),
      db.$count(mileage, eq(mileage.ownerId, id)),
    ]);
    return NextResponse.json({
      ...publicUser(user),
      stats: { items: itemCount, sales: saleCount, mileage: mileageCount },
    });
  }, { requireAdmin: true })(req, ctx);
}

// PUT /api/admin/users/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return ApiErrors.NotFound('User').toResponse();

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;

    // Admin cannot deactivate or role-change their own account
    const selfEdit = String(id) === String(session.user.id);
    if (selfEdit) {
      if (data.isActive === false) {
        return ApiErrors.BadRequest('You cannot deactivate your own account').toResponse();
      }
      if (data.role !== undefined && data.role !== target.role) {
        return ApiErrors.BadRequest('You cannot change your own role').toResponse();
      }
    }

    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.email !== undefined) update.email = data.email;
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.canViewAll !== undefined) update.canViewAll = data.canViewAll;
    if (data.isActive !== undefined) update.isActive = data.isActive;

    const updated = db.update(users).set(update).where(eq(users.id, id)).returning().get();
    return NextResponse.json(publicUser(updated));
  }, { requireAdmin: true })(req, ctx);
}

// DELETE /api/admin/users/[id]?transferDataTo=5
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return ApiErrors.NotFound('User').toResponse();
    if (String(id) === String(session.user.id)) {
      return ApiErrors.BadRequest('You cannot delete your own account').toResponse();
    }

    const transferTo = req.nextUrl.searchParams.get('transferDataTo');
    const transferId = transferTo ? Number(transferTo) : null;

    db.transaction((tx) => {
      if (transferId !== null && Number.isFinite(transferId) && transferId > 0) {
        const recipient = tx.select().from(users).where(eq(users.id, transferId)).get();
        if (!recipient) {
          throw ApiErrors.BadRequest('Transfer recipient not found');
        }
        tx.update(items).set({ ownerId: transferId }).where(eq(items.ownerId, id)).run();
        tx.update(sales).set({ soldBy: transferId }).where(eq(sales.soldBy, id)).run();
        tx.update(mileage).set({ ownerId: transferId }).where(eq(mileage.ownerId, id)).run();
      }
      tx.delete(users).where(eq(users.id, id)).run();
    });

    return NextResponse.json({ success: true });
  }, { requireAdmin: true })(req, ctx);
}