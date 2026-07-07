import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { config } from '@/lib/config';
import { withAuth } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXT_TO_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ itemId: string; filename: string }> }) {
  return withAuth(async (_req, ctx, session) => {
    const { itemId, filename } = await ctx.params;
    const iid = Number(itemId);
    if (!Number.isInteger(iid) || iid <= 0) throw ApiErrors.BadRequest('Invalid itemId');

    const item = await db.query.items.findFirst({ where: eq(items.id, iid) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (!canAccessResource(item.ownerId, session, 'read')) throw ApiErrors.Forbidden();

    // Sanitize filename — prevent path traversal.
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safe || safe !== filename) throw ApiErrors.BadRequest('Invalid filename');

    const ext = `.${filename.split('.').pop()?.toLowerCase() ?? ''}`;
    const contentType = EXT_TO_TYPE[ext] ?? 'application/octet-stream';

    try {
      const buf = await readFile(join(config.uploads.path, 'items', itemId, filename));
      return new NextResponse(buf, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      throw ApiErrors.NotFound('Photo');
    }
  })(req, ctx);
}
