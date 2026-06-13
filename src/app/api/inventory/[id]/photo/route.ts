import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { config } from '@/lib/config';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { deletePhotoSchema } from '@/lib/validations';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id);

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.ownerId !== parseInt(session.user.id) && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) return NextResponse.json({ error: 'No photo provided' }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size: 5MB' }, { status: 400 });
  }

  const ext = file.type.split('/')[1];
  const filename = `${uuidv4()}.${ext}`;
  const itemDir = join(config.uploads.path, 'items', itemId.toString());
  const filePath = join(itemDir, filename);

  await mkdir(itemDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const existingPhotos = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isPrimary = existingPhotos.length === 0;

  const photo = await db.insert(photos).values({
    itemId,
    filename,
    path: `/items/${itemId}/${filename}`,
    isPrimary,
    createdAt: new Date(),
  }).returning() as any[];

  return NextResponse.json(photo[0], { status: 201 });
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id);
  const url = new URL(req.url);
  const photoId = parseInt(url.searchParams.get('photoId') || '0');

  if (!photoId) return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.ownerId !== parseInt(session.user.id) && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const photo = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  try {
    await unlink(join(config.uploads.path, photo.path));
  } catch {}

  await db.delete(photos).where(eq(photos.id, photoId));

  if (photo.isPrimary) {
    const remaining = await db.select().from(photos).where(eq(photos.itemId, itemId)).limit(1);
    if (remaining.length > 0) {
      await db.update(photos).set({ isPrimary: true }).where(eq(photos.id, remaining[0].id));
    }
  }

  return NextResponse.json({ success: true });
});