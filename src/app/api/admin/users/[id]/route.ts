import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { eq, sql } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const userId = parseInt(id);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { passwordHash: _, ...userWithoutHash } = user as any;
  const itemCount = await db.select({ count: sql`count(*)` }).from(items).where(eq(items.ownerId, userId));
  const saleCount = await db.select({ count: sql`count(*)` }).from(sales).where(eq(sales.soldBy, userId));

  return NextResponse.json({
    ...userWithoutHash,
    stats: { items: Number(itemCount[0].count), sales: Number(saleCount[0].count) },
  });
}, { requireAdmin: true });

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id);
  const currentUserId = parseInt(session.user.id);

  if (userId === currentUserId) {
    const body = await req.json();
    if (body.isActive === false || body.role) {
      return NextResponse.json({ error: 'Cannot deactivate or change role of your own account' }, { status: 400 });
    }
  }

  const body = await req.json();
  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const updateData: any = { ...validation.data, updatedAt: new Date() };
  const updated = (await db.update(users).set(updateData).where(eq(users.id, userId)).returning()) as any[];
  if (!updated.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { passwordHash: _, ...userWithoutHash } = updated[0] as any;
  return NextResponse.json(userWithoutHash);
}, { requireAdmin: true });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id);

  if (userId === parseInt(session.user.id)) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const url = new URL(req.url);
  const transferDataTo = url.searchParams.get('transferDataTo');
  if (transferDataTo) {
    const transferId = parseInt(transferDataTo);
    await db.update(items).set({ ownerId: transferId }).where(eq(items.ownerId, userId));
    await db.update(sales).set({ soldBy: transferId }).where(eq(sales.soldBy, userId));
    await db.update(mileage).set({ ownerId: transferId }).where(eq(mileage.ownerId, userId));
  }

  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ success: true });
}, { requireAdmin: true });