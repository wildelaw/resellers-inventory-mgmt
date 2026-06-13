import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { config } from '@/lib/config';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);

  const item = await db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  // Owner check
  if (item.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
    throw ApiErrors.Forbidden();
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw ApiErrors.BadRequest('No file provided');
  }

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw ApiErrors.BadRequest(`Invalid file type. Allowed: ${ALLOWED_PHOTO_TYPES.join(', ')}`);
  }

  if (file.size > MAX_PHOTO_SIZE) {
    throw ApiErrors.BadRequest(`File too large. Maximum size: ${MAX_PHOTO_SIZE / (1024 * 1024)}MB`);
  }

  // Generate UUID filename
  const ext = file.type === 'image/jpeg' ? 'jpg'
    : file.type === 'image/png' ? 'png'
    : file.type === 'image/gif' ? 'gif'
    : 'webp';
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;

  // Create directory if needed
  const itemDir = path.join(config.uploads.path, 'items', String(itemId));
  fs.mkdirSync(itemDir, { recursive: true });

  const filePath = path.join(itemDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Check if this is the first photo (auto-primary)
  const existingPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId)).all();
  const isPrimary = existingPhotos.length === 0 ? 1 : 0;

  const photo = await db.insert(photos).values({
    itemId,
    filename,
    path: filePath,
    isPrimary,
  }).returning().get();

  return NextResponse.json(photo, { status: 201 });
}, { requireAdmin: false });

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);
  const photoId = Number(new URL(req.url).searchParams.get('photoId'));

  if (!photoId) {
    throw ApiErrors.BadRequest('photoId query parameter is required');
  }

  const item = await db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  if (item.ownerId !== Number(session.user.id) && session.user.role !== 'admin') {
    throw ApiErrors.Forbidden();
  }

  const photo = await db.select().from(photos).where(
    and(eq(photos.id, photoId), eq(photos.itemId, itemId))
  ).get();

  if (!photo) {
    throw ApiErrors.NotFound('Photo');
  }

  // Delete file from disk
  try {
    fs.unlinkSync(photo.path);
  } catch {
    // File may not exist on disk; continue with DB cleanup
  }

  // If removing the primary photo, reassign to another photo
  if (photo.isPrimary) {
    const remaining = await db.select().from(photos).where(
      and(eq(photos.itemId, itemId))
    ).all();
    const nextPhoto = remaining.find(p => p.id !== photoId);
    if (nextPhoto) {
      await db.update(photos).set({ isPrimary: 1 }).where(eq(photos.id, nextPhoto.id)).run();
    }
  }

  await db.delete(photos).where(eq(photos.id, photoId)).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: false });