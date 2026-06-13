import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { config } from '@/lib/config';
import { eq } from 'drizzle-orm';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export const GET = withAuth(async (req, ctx, session) => {
  const { itemId: itemIdStr, filename } = await ctx.params;
  const itemId = parseInt(itemIdStr);

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.ownerId !== parseInt(session.user.id) && !canViewAllData(session)) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const filePath = join(config.uploads.path, 'items', itemIdStr, filename);
    const fileBuffer = await readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }
});