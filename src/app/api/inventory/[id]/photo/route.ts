import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { validatePhotoUpload } from '@/lib/validations';
import { sanitizeFilename, generateUUID, getFileExtension, isAllowedImageType } from '@/lib/utils';
import { getUploadsPath } from '@/lib/config';
import { eq } from 'drizzle-orm';
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/inventory/[id]/photo
 * Upload a photo for an item
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    // Get item to check ownership
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      throw ApiErrors.NotFound('Item');
    }

    // Check write access (only owner can upload photos)
    if (item.ownerId !== parseInt(session.user.id)) {
      throw ApiErrors.Forbidden('Only the item owner can upload photos');
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      throw ApiErrors.BadRequest('No photo file provided');
    }

    // Validate file
    const validation = validatePhotoUpload(file);
    if (!validation.valid) {
      throw ApiErrors.BadRequest(validation.error!);
    }

    // Get file extension
    const ext = getFileExtension(file.name);
    if (!isAllowedImageType(ext)) {
      throw ApiErrors.BadRequest('Invalid file type');
    }

    // Generate unique filename
    const uuid = generateUUID();
    const filename = `${uuid}.${ext}`;

    // Create upload directory
    const uploadsPath = getUploadsPath();
    const itemDir = join(uploadsPath, 'items', itemId.toString());
    mkdirSync(itemDir, { recursive: true });

    // Save file
    const filePath = join(itemDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(filePath, buffer);

    // Check if this is the first photo (make it primary)
    const existingPhotos = await db.query.photos.findMany({
      where: eq(photos.itemId, itemId),
    });

    const isPrimary = existingPhotos.length === 0;

    // Save photo record
    const [photo] = await db.insert(photos).values({
      itemId,
      filename,
      path: `/items/${itemId}/${filename}`,
      isPrimary,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(photo, { status: 201 });
  })(req, { params });
}

/**
 * DELETE /api/inventory/[id]/photo
 * Delete a photo
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    const { searchParams } = new URL(req.url);
    const photoIdParam = searchParams.get('photoId');

    if (!photoIdParam) {
      throw ApiErrors.BadRequest('Missing photoId parameter');
    }

    const photoId = parseInt(photoIdParam);
    if (isNaN(photoId)) {
      throw ApiErrors.BadRequest('Invalid photo ID');
    }

    // Get item to check ownership
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      throw ApiErrors.NotFound('Item');
    }

    // Check write access
    if (item.ownerId !== parseInt(session.user.id)) {
      throw ApiErrors.Forbidden('Only the item owner can delete photos');
    }

    // Get photo
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, photoId),
    });

    if (!photo) {
      throw ApiErrors.NotFound('Photo');
    }

    if (photo.itemId !== itemId) {
      throw ApiErrors.BadRequest('Photo does not belong to this item');
    }

    // Delete file
    const uploadsPath = getUploadsPath();
    const filePath = join(uploadsPath, 'items', itemId.toString(), photo.filename);
    
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    // Delete photo record
    await db.delete(photos).where(eq(photos.id, photoId));

    // If this was the primary photo, make another photo primary
    if (photo.isPrimary) {
      const remainingPhotos = await db.query.photos.findMany({
        where: eq(photos.itemId, itemId),
      });

      if (remainingPhotos.length > 0) {
        await db
          .update(photos)
          .set({ isPrimary: true })
          .where(eq(photos.id, remainingPhotos[0].id));
      }
    }

    return NextResponse.json({ success: true });
  })(req, { params });
}
