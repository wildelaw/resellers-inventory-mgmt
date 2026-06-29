import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { config } from '@/lib/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const EXT_TO_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

// GET /api/photos/[itemId]/[filename]
export async function GET(req: NextRequest, ctx: { params: Promise<{ itemId: string; filename: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const { itemId: itemIdStr, filename } = await ctx.params;
    const itemId = Number(itemIdStr);
    if (!Number.isFinite(itemId) || itemId <= 0) return ApiErrors.BadRequest('Invalid itemId').toResponse();

    // Path-traversal: filename must not contain separators or null bytes
    if (/[\\/]/.test(filename) || /\x00/.test(filename) || filename.includes('..')) {
      return ApiErrors.BadRequest('Invalid filename').toResponse();
    }

    const photo = db
      .select()
      .from(photos)
      .where(and(eq(photos.itemId, itemId), eq(photos.filename, filename)))
      .get();
    if (!photo) return ApiErrors.NotFound('Photo').toResponse();

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const fullPath = path.join(config.uploads.path, photo.path);
    let data: Buffer;
    try {
      data = await readFile(fullPath);
    } catch {
      return ApiErrors.NotFound('Photo file').toResponse();
    }
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const type = EXT_TO_TYPE[ext] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  })(req, ctx);
}