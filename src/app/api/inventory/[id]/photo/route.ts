import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { config } from '@/lib/config';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { mkdir, writeFile, unlink, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    // Photo upload: owner only (admins can edit but photo upload restricted to owner per spec).
    if (!canAccessResource(item.ownerId, session, 'write')) throw ApiErrors.Forbidden();

    const formData = await req.formData();
    const file = formData.get('photo');
    if (!(file instanceof File)) throw ApiErrors.BadRequest('No photo file provided');
    if (file.size > MAX_SIZE) throw ApiErrors.BadRequest('Photo exceeds 5MB limit');
    if (!ALLOWED_TYPES.includes(file.type)) throw ApiErrors.BadRequest('Unsupported file type');

    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) throw ApiErrors.BadRequest('Unsupported file extension');
    // Sanitize filename — null bytes / path traversal removed by using UUID.
    const safeFilename = `${randomUUID()}${ext}`;
    const dir = join(config.uploads.path, 'items', String(itemId));
    await mkdir(dir, { recursive: true });
    const fullPath = join(dir, safeFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    // First photo auto-set as primary.
    const existing = await db.select().from(photos).where(eq(photos.itemId, itemId)).all();
    const isPrimary = existing.length === 0;

    const created = db
      .insert(photos)
      .values({
        itemId,
        filename: safeFilename,
        path: join('items', String(itemId), safeFilename),
        isPrimary,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw ApiErrors.NotFound('Item');
    if (!canAccessResource(item.ownerId, session, 'write')) throw ApiErrors.Forbidden();

    const photoId = Number(req.nextUrl.searchParams.get('photoId'));
    if (!Number.isInteger(photoId) || photoId <= 0) throw ApiErrors.BadRequest('photoId required');

    const photo = await db.query.photos.findFirst({
      where: and(eq(photos.id, photoId), eq(photos.itemId, itemId)),
    });
    if (!photo) throw ApiErrors.NotFound('Photo');

    // Remove file from disk.
    try {
      await unlink(join(config.uploads.path, photo.path));
    } catch {
      // file may already be gone
    }

    db.delete(photos).where(eq(photos.id, photoId)).run();

    // If we removed the primary, promote another.
    if (photo.isPrimary) {
      const next = await db.select().from(photos).where(eq(photos.itemId, itemId)).all();
      if (next.length > 0) {
        db.update(photos).set({ isPrimary: true }).where(eq(photos.id, next[0].id)).run();
      }
    }

    return NextResponse.json({ success: true });
  })(req, ctx);
}
