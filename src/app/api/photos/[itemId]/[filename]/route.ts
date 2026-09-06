import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData, sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// GET /api/photos/:itemId/:filename — served via authenticated API route
// (photos are NOT in the public directory). Owner, admin, or canViewAll.
export const GET = withAuth(async (req, ctx, session) => {
  const params = await ctx!.params;
  const itemId = Number(params.itemId);
  const filename = params.filename;

  if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid item id');

  // Path traversal check — only allow a bare filename with a safe extension
  const ext = path.extname(filename).toLowerCase();
  if (path.basename(filename) !== filename || filename.includes('/') || filename.includes('\\') || !CONTENT_TYPES[ext]) {
    throw ApiErrors.BadRequest('Invalid filename');
  }

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw ApiErrors.NotFound('Item');

  const userId = sessionUserId(session);
  if (item.ownerId !== userId && !canViewAllData(session)) throw ApiErrors.Forbidden();

  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.itemId, itemId), eq(photos.filename, filename)),
  });
  if (!photo) throw ApiErrors.NotFound('Photo');

  // Defense-in-depth: read only from the recorded path's basename
  const filePath = path.join(config.uploads.path, 'items', String(itemId), path.basename(photo.filename));
  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext],
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    throw ApiErrors.NotFound('Photo');
  }
});