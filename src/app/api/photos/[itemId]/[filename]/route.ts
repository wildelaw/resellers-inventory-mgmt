import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { config } from '@/lib/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Session } from 'next-auth';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export const GET = withAuth(async (req: NextRequest, ctx, session: Session) => {
  const { itemId, filename } = await ctx.params;
  const itemIdNum = parseInt(itemId, 10);
  if (isNaN(itemIdNum)) throw ApiErrors.BadRequest('Invalid item ID');

  // Verify item exists and user has access
  const item = await db.query.items.findFirst({ where: eq(items.id, itemIdNum) });
  if (!item) throw ApiErrors.NotFound('Item');

  if (item.ownerId !== parseInt(session.user.id, 10) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  // Sanitize filename (prevent path traversal)
  const safeFilename = filename.replace(/\.\./g, '').replace(/\0/g, '').replace(/[\\/]/g, '');

  // Verify photo record exists
  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.itemId, itemIdNum), eq(photos.filename, safeFilename)),
  });
  if (!photo) throw ApiErrors.NotFound('Photo');

  const filePath = join(config.uploads.path, photo.path);
  if (!existsSync(filePath)) throw ApiErrors.NotFound('Photo file');

  const ext = safeFilename.substring(safeFilename.lastIndexOf('.')).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const fileBuffer = readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});