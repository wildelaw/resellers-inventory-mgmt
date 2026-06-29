import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, photos } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { ApiErrors } from '@/lib/api-errors';
import { canAccessResource } from '@/lib/auth-utils';
import { config } from '@/lib/config';
import { mkdirSync, writeFile, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function itemPhotosDir(itemId: number): string {
  return path.join(config.uploads.path, 'items', String(itemId));
}

function sanitizeFilename(name: string): string {
  // Strip null bytes and path separators
  return name.replace(/[\x00-\x1f]/g, '').replace(/[\\/]/g, '');
}

function extForType(type: string): string | null {
  switch (type) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    default: return null;
  }
}

// POST /api/inventory/[id]/photo — upload photo
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const itemId = Number(idStr);
    if (!Number.isFinite(itemId) || itemId <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return ApiErrors.BadRequest('Missing "file" field').toResponse();
    }
    if (file.size > MAX_BYTES) {
      return ApiErrors.BadRequest('File too large (max 5MB)').toResponse();
    }
    const type = file.type || '';
    if (!ALLOWED_TYPES.has(type)) {
      return ApiErrors.BadRequest('Unsupported file type').toResponse();
    }
    const ext = extForType(type);
    if (!ext) return ApiErrors.BadRequest('Unsupported file type').toResponse();

    // Sanitize original filename for validation only; actual stored name is UUID
    const originalName = sanitizeFilename(file.name || `photo.${ext}`);
    if (!ALLOWED_EXTS.has(originalName.split('.').pop()?.toLowerCase() ?? '')) {
      return ApiErrors.BadRequest('Invalid file extension').toResponse();
    }

    const uuid = randomUUID();
    const filename = `${uuid}.${ext}`;
    const dir = itemPhotosDir(itemId);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
    const fullPath = path.join(dir, filename);
    const relPath = `items/${itemId}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await new Promise<void>((resolve, reject) => {
      writeFile(fullPath, buffer, (err) => err ? reject(err) : resolve());
    });

    // First photo auto-primary
    const existingCount = db.select().from(photos).where(eq(photos.itemId, itemId)).all().length;
    const isPrimary = existingCount === 0;

    const created = db
      .insert(photos)
      .values({
        itemId,
        filename,
        path: relPath,
        isPrimary,
        createdAt: Date.now(),
      })
      .returning()
      .get();

    return NextResponse.json(created, { status: 201 });
  })(req, ctx);
}

// DELETE /api/inventory/[id]/photo?photoId=5
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const itemId = Number(idStr);
    if (!Number.isFinite(itemId) || itemId <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const photoId = Number(req.nextUrl.searchParams.get('photoId'));
    if (!Number.isFinite(photoId) || photoId <= 0) {
      return ApiErrors.BadRequest('Missing or invalid photoId').toResponse();
    }

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) return ApiErrors.NotFound('Item').toResponse();
    if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
      return ApiErrors.Forbidden().toResponse();
    }

    const photo = db.select().from(photos).where(eq(photos.id, photoId)).get();
    if (!photo || photo.itemId !== itemId) {
      return ApiErrors.NotFound('Photo').toResponse();
    }

    // Remove file (best-effort)
    const fullPath = path.join(config.uploads.path, photo.path);
    try { unlinkSync(fullPath); } catch { /* ignore */ }

    db.delete(photos).where(eq(photos.id, photoId)).run();

    // If primary was deleted, promote the first remaining
    if (photo.isPrimary) {
      const remaining = db.select().from(photos).where(eq(photos.itemId, itemId)).all();
      if (remaining.length > 0) {
        db.update(photos).set({ isPrimary: true }).where(eq(photos.id, remaining[0].id)).run();
      }
    }

    return NextResponse.json({ success: true });
  })(req, ctx);
}