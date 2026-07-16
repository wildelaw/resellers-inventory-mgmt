import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { withAuth } from "@/lib/api-utils";
import { config } from "@/lib/config";
import { ApiErrors } from "@/lib/api-errors";
import { canViewAllData } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { items, photos } from "@/lib/schema";
import { eq } from "drizzle-orm";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export const GET = withAuth(async (_req, ctx, session) => {
  const { itemId, filename } = await ctx.params;
  if (!/^\d+$/.test(itemId)) throw ApiErrors.BadRequest("Invalid itemId");
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw ApiErrors.BadRequest("Invalid filename");
  }

  const item = await db.query.items.findFirst({
    where: eq(items.id, Number(itemId)),
  });
  if (!item) throw ApiErrors.NotFound("Item");

  if (item.ownerId !== Number(session.user.id) && !canViewAllData(session)) {
    throw ApiErrors.Forbidden();
  }

  const photo = await db.query.photos.findFirst({
    where: eq(photos.filename, filename),
  });
  if (!photo || photo.itemId !== item.id) {
    throw ApiErrors.NotFound("Photo");
  }

  const filepath = path.join(config.uploads.path, photo.path);
  if (!existsSync(filepath)) {
    throw ApiErrors.NotFound("File");
  }
  const data = await readFile(filepath);
  const ext = path.extname(filename).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
