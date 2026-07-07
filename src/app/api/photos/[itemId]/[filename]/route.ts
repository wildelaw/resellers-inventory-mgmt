import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { config } from '@/lib/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { itemId, filename } = await ctx.params;
      const itemIdNum = Number(itemId);

      // Verify item exists and user has access
      const item = await db.query.items.findFirst({
        where: eq(items.id, itemIdNum),
      });

      if (!item) throw ApiErrors.NotFound('Item');

      if (!canAccessResource(item.ownerId, session, 'read')) {
        throw ApiErrors.Forbidden();
      }

      // Verify photo exists
      const photo = await db.query.photos.findFirst({
        where: and(eq(photos.itemId, itemIdNum), eq(photos.filename, filename)),
      });

      if (!photo) throw ApiErrors.NotFound('Photo');

      // Read file
      const filePath = join(config.uploads.path, photo.path);
      if (!existsSync(filePath)) {
        throw ApiErrors.NotFound('Photo file');
      }

      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

      const fileBuffer = readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, ctx);
}