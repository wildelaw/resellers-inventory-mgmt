import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { updateUserSchema } from '@/lib/validations';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { passwordHash, ...userData } = user;
    return NextResponse.json({ user: { ...userData, canViewAll: userData.canViewAll === 1, isActive: userData.isActive === 1 } });
  }, { requireAdmin: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    if (userId === session.user.id) {
      const body = await req.json();
      if (body.isActive === false || (body.role && body.role !== session.user.role))
        return NextResponse.json({ error: 'Cannot deactivate or change role of your own account' }, { status: 400 });
    }
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const updateData: Record<string, unknown> = { ...validation.data, updatedAt: now };
    if (validation.data.canViewAll !== undefined) updateData.canViewAll = validation.data.canViewAll ? 1 : 0;
    if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive ? 1 : 0;
    await db.update(users).set(updateData).where(eq(users.id, userId));
    const updated = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const { passwordHash, ...userData } = updated!;
    return NextResponse.json({ user: { ...userData, canViewAll: userData.canViewAll === 1, isActive: userData.isActive === 1 } });
  }, { requireAdmin: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    if (userId === session.user.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    const transferDataTo = req.nextUrl.searchParams.get('transferDataTo');
    if (transferDataTo) {
      const transferToId = parseInt(transferDataTo, 10);
      await db.update(items).set({ ownerId: transferToId }).where(eq(items.ownerId, userId));
      await db.update(sales).set({ soldBy: transferToId }).where(eq(sales.soldBy, userId));
      await db.update(mileage).set({ ownerId: transferToId }).where(eq(mileage.ownerId, userId));
    }
    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }, { requireAdmin: true });
}
