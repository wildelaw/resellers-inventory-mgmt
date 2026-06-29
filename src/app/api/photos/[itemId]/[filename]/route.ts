import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData, currentUserId } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
};

export const GET = withAuth(async (_req, ctx, session) => {
  const { itemId: itemIdStr, filename } = await ctx.params;
  const itemId = parseInt(itemIdStr, 10);
  if (!Number.isFinite(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid item id');
  if (!filename) throw ApiErrors.BadRequest('Filename required');

  const item = db.query.items.findFirst({ where: eq(items.id, itemId) }).sync();
  if (!item) throw ApiErrors.NotFound('Item');

  const uid = currentUserId(session);
  if (item.ownerId !== uid && !canViewAllData(session)) throw ApiErrors.Forbidden();

  // Lookup the photo by filename on this item (prevents path traversal via filename).
  const photo = db.select().from(photos).where(eq(photos.itemId, itemId)).all()
    .find((p) => p.filename === filename);
  if (!photo) throw ApiErrors.NotFound('Photo');

  const fullPath = path.join(config.uploads.path, photo.path);
  let data: Buffer;
  try {
    data = await readFile(fullPath);
  } catch {
    throw ApiErrors.NotFound('Photo file');
  }

  const ext = (filename.split('.').pop() || '').toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});