import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq, sql } from 'drizzle-orm';

/**
 * GET /api/admin/users/[id]
 * Get a single user with stats (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      throw ApiErrors.BadRequest('Invalid user ID');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        passwordHash: false, // Exclude password hash
      },
    });

    if (!user) {
      throw ApiErrors.NotFound('User');
    }

    // Get user stats
    const [itemCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(eq(items.ownerId, userId));

    const [saleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(eq(sales.soldBy, userId));

    const [mileageCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mileage)
      .where(eq(mileage.ownerId, userId));

    return NextResponse.json({
      user,
      stats: {
        itemCount: itemCount.count,
        saleCount: saleCount.count,
        mileageCount: mileageCount.count,
      },
    });
  }, { requireAdmin: true })(req, { params });
}

/**
 * PUT /api/admin/users/[id]
 * Update a user (admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      throw ApiErrors.BadRequest('Invalid user ID');
    }

    // Cannot modify own account's role or active status
    if (userId === parseInt(session.user.id)) {
      throw ApiErrors.BadRequest('Cannot modify your own role or active status');
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      throw ApiErrors.NotFound('User');
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    // Check if email is being changed and if it's already taken
    if (validation.data.email && validation.data.email !== existingUser.email) {
      const emailExists = await db.query.users.findFirst({
        where: eq(users.email, validation.data.email),
      });

      if (emailExists) {
        throw ApiErrors.Conflict('Email already exists');
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        canViewAll: users.canViewAll,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json(updatedUser);
  }, { requireAdmin: true })(req, { params });
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      throw ApiErrors.BadRequest('Invalid user ID');
    }

    // Cannot delete own account
    if (userId === parseInt(session.user.id)) {
      throw ApiErrors.BadRequest('Cannot delete your own account');
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      throw ApiErrors.NotFound('User');
    }

    const { searchParams } = new URL(req.url);
    const transferToId = searchParams.get('transferDataTo');

    if (transferToId) {
      const transferTo = parseInt(transferToId);
      
      if (isNaN(transferTo)) {
        throw ApiErrors.BadRequest('Invalid transferDataTo user ID');
      }

      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, transferTo),
      });

      if (!targetUser) {
        throw ApiErrors.NotFound('Target user for data transfer');
      }

      // Transfer data in transaction
      await db.transaction(async (tx) => {
        await tx.update(items).set({ ownerId: transferTo }).where(eq(items.ownerId, userId));
        await tx.update(sales).set({ soldBy: transferTo }).where(eq(sales.soldBy, userId));
        await tx.update(mileage).set({ ownerId: transferTo }).where(eq(mileage.ownerId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });
    } else {
      // Delete user and all their data
      await db.transaction(async (tx) => {
        // Delete in dependency order
        await tx.delete(mileage).where(eq(mileage.ownerId, userId));
        
        // Get all items owned by user
        const userItems = await tx.select({ id: items.id }).from(items).where(eq(items.ownerId, userId));
        const itemIds = userItems.map(i => i.id);
        
        // Delete sales for those items
        if (itemIds.length > 0) {
          await tx.delete(sales).where(sql`${sales.itemId} IN ${itemIds}`);
        }
        
        // Delete sales by user
        await tx.delete(sales).where(eq(sales.soldBy, userId));
        
        // Delete items (cascades to photos)
        await tx.delete(items).where(eq(items.ownerId, userId));
        
        // Delete user
        await tx.delete(users).where(eq(users.id, userId));
      });
    }

    return NextResponse.json({ success: true });
  }, { requireAdmin: true })(req, { params });
}
