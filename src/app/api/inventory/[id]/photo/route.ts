import { NextResponse, type NextRequest } from 'next/server';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { sessionUserId, canEditOthersData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function getOwnedItem(itemId: number, sessionUserIdValue: number, isAdmin: boolean) {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw ApiErrors.NotFound('Item');
  if (item.ownerId !== sessionUserIdValue && !isAdmin) throw ApiErrors.Forbidden();
  return item;
}

// POST /api/inventory/:id/photo — multipart upload, item owner only
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const itemId = Number(id);
  await getOwnedItem(itemId, sessionUserId(session), canEditOthersData(session));

  const formData = await req.formData().catch(() => null);
  if (!formData) throw ApiErrors.BadRequest('Expected multipart/form-data body');

  const file = formData.get('file');
  if (!(file instanceof File)) throw ApiErrors.BadRequest('File is required');

  // Validate type, size, and derive a safe extension
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw ApiErrors.BadRequest('Allowed types: JPEG, PNG, GIF, WebP');
  if (file.size > MAX_SIZE) throw ApiErrors.BadRequest('File exceeds 5MB limit');

  // Store under a UUID filename — user input never touches the filesystem path
  const filename = `${randomUUID()}${ext}`;
  const itemDir = path.join(config.uploads.path, 'items', String(itemId));
  await mkdir(itemDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(itemDir, filename), buffer);

  // First photo becomes primary automatically
  const existing = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isPrimary = existing.length === 0;

  const inserted = await db.insert(photos).values({
    itemId,
    filename,
    path: `/items/${itemId}/${filename}`,
    isPrimary,
    createdAt: new Date(),
  }).returning();

  return NextResponse.json(inserted[0], { status: 201 });
});

// DELETE /api/inventory/:id/photo?photoId=N — item owner only
export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const itemId = Number(id);
  await getOwnedItem(itemId, sessionUserId(session), canEditOthersData(session));

  const photoId = Number(req.nextUrl.searchParams.get('photoId'));
  if (!photoId || isNaN(photoId)) throw ApiErrors.BadRequest('photoId query parameter is required');

  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.id, photoId), eq(photos.itemId, itemId)),
  });
  if (!photo) throw ApiErrors.NotFound('Photo');

  db.transaction((tx) => {
    tx.delete(photos).where(eq(photos.id, photoId)).run();
    // Promote another photo to primary if we deleted the primary one
    if (photo.isPrimary) {
      const remaining = tx.select().from(photos).where(eq(photos.itemId, itemId)).limit(1).all();
      if (remaining.length > 0) {
        tx.update(photos).set({ isPrimary: true }).where(eq(photos.id, remaining[0].id)).run();
      }
    }
    return null;
  });

  // Best-effort file removal (record is gone regardless)
  const filePath = path.join(config.uploads.path, 'items', String(itemId), photo.filename);
  await unlink(filePath).catch(() => undefined);

  return NextResponse.json({ success: true });
});