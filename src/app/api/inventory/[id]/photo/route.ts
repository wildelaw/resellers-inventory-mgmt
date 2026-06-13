import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { config } from '@/lib/config';
import { canViewAllData } from '@/lib/auth-utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');
    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (session.user.role !== 'admin' && item.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;
    if (!file) throw ApiErrors.BadRequest('No photo file provided');
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw ApiErrors.BadRequest('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
    if (file.size > MAX_PHOTO_SIZE) throw ApiErrors.BadRequest('File too large. Maximum size: 5MB');
    const ext = extname(file.name).toLowerCase() || '.jpg';
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) throw ApiErrors.BadRequest('Invalid file extension');
    const filename = `${randomUUID()}${ext}`;
    const uploadDir = join(config.uploads.path, 'items', String(itemId));
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    const relativePath = `items/${itemId}/${filename}`;
    writeFileSync(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
    const existingPhotos = await db.query.photos.findMany({ where: eq(photos.itemId, itemId) });
    const isPrimary = existingPhotos.length === 0 ? 1 : 0;
    const now = Math.floor(Date.now() / 1000);
    const photo = await db.insert(photos).values({ itemId, filename, path: relativePath, isPrimary, createdAt: now }).returning() as any[];
    return NextResponse.json({ photo: photo[0] }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');
    const photoId = parseInt(req.nextUrl.searchParams.get('photoId') || '', 10);
    if (isNaN(photoId)) throw ApiErrors.BadRequest('Invalid photo ID');
    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (session.user.role !== 'admin' && item.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const photo = await db.query.photos.findFirst({ where: and(eq(photos.id, photoId), eq(photos.itemId, itemId)) });
    if (!photo) throw ApiErrors.NotFound('Photo');
    const filePath = join(config.uploads.path, photo.path);
    if (existsSync(filePath)) { try { unlinkSync(filePath); } catch {} }
    await db.delete(photos).where(eq(photos.id, photoId));
    if (photo.isPrimary) {
      const remaining = await db.query.photos.findMany({ where: eq(photos.itemId, itemId) });
      if (remaining.length > 0) await db.update(photos).set({ isPrimary: 1 }).where(eq(photos.id, remaining[0].id));
    }
    return NextResponse.json({ success: true });
  });
}
