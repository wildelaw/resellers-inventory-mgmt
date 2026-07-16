import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { resetPasswordSchema } from "@/lib/validations";
import { ApiErrors } from "@/lib/api-errors";

export const POST = withAuth(
  async (req, ctx) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw ApiErrors.BadRequest("Invalid id");

    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) throw ApiErrors.NotFound("User");

    const body = await req.json();
    const data = resetPasswordSchema.parse(body);

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
