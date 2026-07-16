import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { profileUpdateSchema } from "@/lib/validations";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(async (_req, _ctx, session) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(session.user.id)),
  });
  if (!user) throw ApiErrors.NotFound("User");
  return NextResponse.json({
    user: {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      canViewAll: user.canViewAll,
    },
  });
});

export const PUT = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = profileUpdateSchema.parse(body);

  const userId = Number(session.user.id);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw ApiErrors.NotFound("User");

  const now = Math.floor(Date.now() / 1000);

  if (data.type === "profile") {
    await db
      .update(users)
      .set({ name: data.name, updatedAt: now })
      .where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  } else {
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw ApiErrors.BadRequest("Current password is incorrect");
    const hash = await bcrypt.hash(data.newPassword, 10);
    await db
      .update(users)
      .set({
        passwordHash: hash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    return NextResponse.json({ success: true, sessionInvalidated: true });
  }
});
