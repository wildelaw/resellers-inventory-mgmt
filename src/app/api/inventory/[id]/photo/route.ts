import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, photos } from "@/lib/schema";
import { canEditOthersData } from "@/lib/auth-utils";
import { ApiErrors } from "@/lib/api-errors";
import { config } from "@/lib/config";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) throw ApiErrors.BadRequest("Invalid id");

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  const ownerId = Number(session.user.id);
  if (item.ownerId !== ownerId && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw ApiErrors.BadRequest("No file uploaded");
  }

  if (file.size > config.upload.maxSizeBytes) {
    throw ApiErrors.BadRequest("File too large (max 5MB)");
  }
  if (!(config.upload.allowedMimeTypes as readonly string[]).includes(file.type)) {
    throw ApiErrors.BadRequest("Invalid file type");
  }

  const ext = EXT_MAP[file.type] || path.extname(file.name).toLowerCase();
  if (!(config.upload.allowedExtensions as readonly string[]).includes(ext)) {
    throw ApiErrors.BadRequest("Invalid file extension");
  }

  const safeName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(config.uploads.path, "items", String(itemId));
  const filepath = path.join(dir, safeName);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const existing = await db.select().from(photos).where(eq(photos.itemId, itemId));
  const isPrimary = existing.length === 0;

  const inserted = await db
    .insert(photos)
    .values({
      itemId,
      filename: safeName,
      path: `items/${itemId}/${safeName}`,
      isPrimary,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) throw ApiErrors.BadRequest("Invalid id");

  const url = new URL(req.url);
  const photoId = Number(url.searchParams.get("photoId"));
  if (!Number.isFinite(photoId)) throw ApiErrors.BadRequest("Invalid photoId");

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  const ownerId = Number(session.user.id);
  if (item.ownerId !== ownerId && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
  });
  if (!photo || photo.itemId !== itemId) {
    throw ApiErrors.NotFound("Photo");
  }

  const filepath = path.join(config.uploads.path, photo.path);
  try {
    if (existsSync(filepath)) await unlink(filepath);
  } catch {
    /* ignore */
  }

  await db.delete(photos).where(eq(photos.id, photoId));
  return NextResponse.json({ success: true });
});
