import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { config } from '@/lib/config';
import { nowTimestamp } from '@/lib/utils';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { Session } from 'next-auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw ApiErrors.NotFound('Item');
  if (item.ownerId !== parseInt(session.user.id, 10)) {
    throw ApiErrors.Forbidden();
  }

  const formData = await req.formData();
  const file = formData.get('photo');
  if (!(file instanceof File)) {
    throw ApiErrors.BadRequest('No photo file provided');
  }

  if (file.size > MAX_SIZE) {
    throw ApiErrors.BadRequest('File size exceeds 5MB limit');
  }

  const contentType = file.type;
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw ApiErrors.BadRequest('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
  }

  // Sanitize filename and generate UUID
  const originalName = file.name.replace(/\.\./g, '').replace(/\0/g, '');
  const ext = ALLOWED_EXTENSIONS.find((e) => originalName.toLowerCase().endsWith(e)) || '.jpg';
  const filename = `${randomUUID()}${ext}`;

  const itemDir = join(config.uploads.path, 'items', String(itemId));
  try {
    mkdirSync(itemDir, { recursive: true });
  } catch {
    // directory may exist
  }

  const filePath = join(itemDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filePath, buffer);

  // Check if this is the first photo (set as primary)
  const existingPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isPrimary = existingPhotos.length === 0 ? 1 : 0;

  const photo = await db.insert(photos).values({
    itemId,
    filename,
    path: `items/${itemId}/${filename}`,
    isPrimary,
    createdAt: nowTimestamp(),
  }).returning();

  return NextResponse.json(photo[0], { status: 201 });
});

export const DELETE = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) throw ApiErrors.BadRequest('Invalid item ID');

  const { searchParams } = new URL(req.url);
  const photoId = parseInt(searchParams.get('photoId') || '', 10);
  if (isNaN(photoId)) throw ApiErrors.BadRequest('Invalid photo ID');

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw ApiErrors.NotFound('Item');
  if (item.ownerId !== parseInt(session.user.id, 10)) {
    throw ApiErrors.Forbidden();
  }

  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.id, photoId), eq(photos.itemId, itemId)),
  });
  if (!photo) throw ApiErrors.NotFound('Photo');

  // Delete file from disk
  const filePath = join(config.uploads.path, photo.path);
  if (existsSync(filePath)) {
    try { unlinkSync(filePath); } catch { /* ignore */ }
  }

  await db.delete(photos).where(eq(photos.id, photoId));
  return NextResponse.json({ success: true });
});