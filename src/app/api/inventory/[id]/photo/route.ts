import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { mkdirSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { items, photos, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canEditOthersData, currentUserId } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

async function loadItem(id: number) {
  const item = db.query.items.findFirst({ where: eq(items.id, id) }).sync();
  if (!item) throw ApiErrors.NotFound('Item');
  return item;
}

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const item = await loadItem(itemId);
  const uid = currentUserId(session);
  if (item.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const form = await req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) throw ApiErrors.BadRequest('No photo file provided');
  if (file.size > MAX_BYTES) throw ApiErrors.BadRequest('Photo exceeds 5MB limit');
  const type = file.type || '';
  if (!ALLOWED_TYPES.has(type)) throw ApiErrors.BadRequest('Unsupported file type');

  const ext = EXT_BY_TYPE[type] || 'jpg';
  // UUID filename, sanitized (no path traversal possible via random uuid).
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;
  const dir = path.join(config.uploads.path, 'items', String(itemId));
  mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buf);

  // First photo auto-primary.
  const hasPrimary = db.select().from(photos).where(eq(photos.itemId, itemId)).all().some((p) => p.isPrimary === 1);
  const isPrimary = hasPrimary ? 0 : 1;
  const relPath = `/items/${itemId}/${filename}`;

  const [photo] = db.insert(photos).values({
    itemId, filename, path: relPath, isPrimary, createdAt: nowTs(),
  }).returning().all();

  return NextResponse.json(photo, { status: 201 });
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

  const photoId = parseInt(req.nextUrl.searchParams.get('photoId') ?? '', 10);
  if (!Number.isFinite(photoId) || photoId <= 0) throw ApiErrors.BadRequest('photoId required');

  const item = await loadItem(itemId);
  const uid = currentUserId(session);
  if (item.ownerId !== uid && !canEditOthersData(session)) throw ApiErrors.Forbidden();

  const photo = db.select().from(photos).where(eq(photos.id, photoId)).all()[0];
  if (!photo || photo.itemId !== itemId) throw ApiErrors.NotFound('Photo');

  const fullPath = path.join(config.uploads.path, photo.path);
  await unlink(fullPath).catch(() => { /* file may be gone */ });
  db.delete(photos).where(eq(photos.id, photoId)).run();

  return NextResponse.json({ success: true });
});