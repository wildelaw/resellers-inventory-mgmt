import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos, sales } from '@/lib/schema';
import { updateItemSchema } from '@/lib/validations';
import { isValidTransition } from '@/lib/constants';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import { config } from '@/lib/config';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');
    const item = await db.query.items.findFirst({ where: eq(items.id, itemId), with: { photos: true, sales: true, owner: true } });
    if (!item) throw ApiErrors.NotFound('Item');
    if (session.user.role !== 'admin' && session.user.canViewAll !== true && item.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    return NextResponse.json({ item });
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');
    const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!existing) throw ApiErrors.NotFound('Item');
    if (session.user.role !== 'admin' && existing.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const body = await req.json();
    const validation = updateItemSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const updates = validation.data as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (updates.status && updates.status !== existing.status) {
      if (!isValidTransition(existing.status as any, updates.status as any)) return NextResponse.json({ error: `Cannot transition from "${existing.status}" to "${updates.status}"` }, { status: 400 });
      if (['donated', 'discarded'].includes(updates.status as string)) updates.removalDate = now;
      if (updates.status === 'available' && existing.status === 'returned') updates.removalDate = null;
    }
    const updated = await db.update(items).set(updates as any).where(eq(items.id, itemId)).returning();
    return NextResponse.json({ item: updated[0] });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');
    const existing = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!existing) throw ApiErrors.NotFound('Item');
    if (session.user.role !== 'admin' && existing.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const itemPhotos = await db.query.photos.findMany({ where: eq(photos.itemId, itemId) });
    for (const photo of itemPhotos) { const filePath = join(config.uploads.path, photo.path); if (existsSync(filePath)) { try { unlinkSync(filePath); } catch {} } }
    await db.delete(photos).where(eq(photos.itemId, itemId));
    await db.delete(sales).where(eq(sales.itemId, itemId));
    await db.delete(items).where(eq(items.id, itemId));
    return NextResponse.json({ success: true });
  });
}
