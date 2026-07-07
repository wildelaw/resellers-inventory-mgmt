import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { nowTimestamp } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST - Upload photo
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const itemId = Number(id);

      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      });

      if (!item) throw ApiErrors.NotFound('Item');

      // Only owner can upload photos
      if (!canAccessResource(item.ownerId, session, 'write')) {
        throw ApiErrors.Forbidden();
      }

      const formData = await req.formData();
      const file = formData.get('photo') as File;

      if (!file) {
        throw ApiErrors.BadRequest('No file provided');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw ApiErrors.BadRequest('File size exceeds 5MB limit');
      }

      const contentType = file.type;
      if (!ALLOWED_TYPES.includes(contentType)) {
        throw ApiErrors.BadRequest('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      }

      // Determine extension from content type
      const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];

      // Generate safe filename
      const filename = `${randomUUID()}.${ext}`;
      const uploadDir = join(config.uploads.path, 'items', String(itemId));
      const filePath = join(uploadDir, filename);
      const relativePath = `items/${itemId}/${filename}`;

      // Create directory
      mkdirSync(uploadDir, { recursive: true });

      // Write file
      const arrayBuffer = await file.arrayBuffer();
      writeFileSync(filePath, Buffer.from(arrayBuffer));

      // Check if this is the first photo (make it primary)
      const existingPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId));
      const isPrimary = existingPhotos.length === 0;

      const newPhoto = await db.insert(photos).values({
        itemId,
        filename,
        path: relativePath,
        isPrimary,
        createdAt: nowTimestamp(),
      }).returning();

      return NextResponse.json(newPhoto[0], { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}

// DELETE - Delete photo
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const itemId = Number(id);
      const { searchParams } = new URL(req.url);
      const photoId = Number(searchParams.get('photoId'));

      if (!photoId) {
        throw ApiErrors.BadRequest('Photo ID is required');
      }

      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      });

      if (!item) throw ApiErrors.NotFound('Item');

      // Only owner can delete photos
      if (!canAccessResource(item.ownerId, session, 'write')) {
        throw ApiErrors.Forbidden();
      }

      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
      });

      if (!photo || photo.itemId !== itemId) {
        throw ApiErrors.NotFound('Photo');
      }

      // Delete file
      const filePath = join(config.uploads.path, photo.path);
      try {
        unlinkSync(filePath);
      } catch {
        // File may not exist
      }

      // Delete from DB
      await db.delete(photos).where(eq(photos.id, photoId));

      // If deleted photo was primary, make the first remaining photo primary
      if (photo.isPrimary) {
        const remaining = await db.select().from(photos).where(eq(photos.itemId, itemId)).limit(1);
        if (remaining.length > 0) {
          await db.update(photos).set({ isPrimary: true }).where(eq(photos.id, remaining[0].id));
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}