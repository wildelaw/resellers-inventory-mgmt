import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';
import { config } from '@/lib/config';
import path from 'path';
import fs from 'fs';

export const GET = withAuth(async (_req, ctx, session) => {
  const { itemId, filename } = await ctx.params;

  // Find the photo record
  const photo = await db.select().from(photos).where(
    and(eq(photos.itemId, Number(itemId)), eq(photos.filename, filename))
  ).get();

  if (!photo) {
    throw ApiErrors.NotFound('Photo');
  }

  // Check access to the item
  const item = await db.select().from(items).where(eq(items.id, Number(itemId))).get();
  if (!item) {
    throw ApiErrors.NotFound('Item');
  }

  if (!canAccessResource(item.ownerId, Number(session.user.id), session, 'read')) {
    throw ApiErrors.Forbidden();
  }

  // Read file from disk
  const filePath = path.join(config.uploads.path, 'items', itemId, filename);

  if (!fs.existsSync(filePath)) {
    throw ApiErrors.NotFound('Photo file');
  }

  const fileBuffer = fs.readFileSync(filePath);

  // Determine content type
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.png' ? 'image/png'
    : ext === '.gif' ? 'image/gif'
    : 'image/webp';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400',
      'Content-Length': String(fileBuffer.length),
    },
  });
}, { requireAdmin: false });