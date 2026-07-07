import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, items, sales, mileage, photos } from '@/lib/schema';
import { eq, sql, count } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateUserSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp } from '@/lib/utils';

// GET - Get user details
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { id } = await ctx.params;
      const userId = Number(id);

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) throw ApiErrors.NotFound('User');

      // Get stats
      const [itemCount, saleCount, mileageCount] = await Promise.all([
        db.select({ count: count() }).from(items).where(eq(items.ownerId, userId)),
        db.select({ count: count() }).from(sales).where(eq(sales.soldBy, userId)),
        db.select({ count: count() }).from(mileage).where(eq(mileage.ownerId, userId)),
      ]);

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        canViewAll: user.canViewAll,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        createdBy: user.createdBy,
        stats: {
          items: Number(itemCount[0]?.count ?? 0),
          sales: Number(saleCount[0]?.count ?? 0),
          mileage: Number(mileageCount[0]?.count ?? 0),
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, ctx);
}

// PUT - Update user
export async function PUT(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const userId = Number(id);

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) throw ApiErrors.NotFound('User');

      // Admin cannot deactivate or change own role
      const currentUserId = Number(session.user.id);
      const body = await req.json();
      const validation = updateUserSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;

      if (currentUserId === userId) {
        if (data.isActive === false) {
          throw ApiErrors.BadRequest('You cannot deactivate your own account');
        }
        if (data.role && data.role !== user.role) {
          throw ApiErrors.BadRequest('You cannot change your own role');
        }
      }

      const updateData: Record<string, any> = { updatedAt: nowTimestamp() };

      if (data.email !== undefined) updateData.email = data.email.toLowerCase();
      if (data.name !== undefined) updateData.name = data.name;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.canViewAll !== undefined) updateData.canViewAll = data.canViewAll;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updated = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      return NextResponse.json({
        id: updated[0].id,
        email: updated[0].email,
        name: updated[0].name,
        role: updated[0].role,
        canViewAll: updated[0].canViewAll,
        isActive: updated[0].isActive,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, ctx);
}

// DELETE - Delete user
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const userId = Number(id);

      // Prevent self-deletion
      if (userId === Number(session.user.id)) {
        throw ApiErrors.BadRequest('You cannot delete your own account');
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) throw ApiErrors.NotFound('User');

      const { searchParams } = new URL(req.url);
      const transferDataTo = searchParams.get('transferDataTo');

      if (transferDataTo) {
        const transferToId = Number(transferDataTo);
        // Transfer items, sales, mileage to new owner
        await db.update(items).set({ ownerId: transferToId }).where(eq(items.ownerId, userId));
        await db.update(sales).set({ soldBy: transferToId }).where(eq(sales.soldBy, userId));
        await db.update(mileage).set({ ownerId: transferToId }).where(eq(mileage.ownerId, userId));
      } else {
        // Delete all user's data
        // Get user's items
        const userItems = await db.query.items.findMany({
          where: eq(items.ownerId, userId),
        });
        for (const item of userItems) {
          await db.delete(photos).where(eq(photos.itemId, item.id));
          await db.delete(sales).where(eq(sales.itemId, item.id));
        }
        await db.delete(items).where(eq(items.ownerId, userId));
        await db.delete(sales).where(eq(sales.soldBy, userId));
        await db.delete(mileage).where(eq(mileage.ownerId, userId));
      }

      await db.delete(users).where(eq(users.id, userId));

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, ctx);
}