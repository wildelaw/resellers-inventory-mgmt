import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { config } from '@/lib/config';
import { existsSync, readFileSync } from 'fs';
import { join, extname } from 'path';
import { ApiErrors } from '@/lib/api-errors';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ itemId: string; filename: string }> }) {
  return withAuth(req, async (session) => {
    const { itemId, filename } = await params;
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(itemIdNum)) throw ApiErrors.BadRequest('Invalid item ID');
    const item = await db.query.items.findFirst({ where: eq(items.id, itemIdNum) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (!canViewAllData(session) && item.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const photo = await db.query.photos.findFirst({ where: eq(photos.itemId, itemIdNum) });
    if (!photo) throw ApiErrors.NotFound('Photo');
    const filePath = join(config.uploads.path, photo.path);
    if (!existsSync(filePath)) throw ApiErrors.NotFound('Photo file');
    const ext = extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    return new NextResponse(readFileSync(filePath), { headers: { 'Content-Type': contentTypes[ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' } });
  });
}
