import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const POST = withAuth(async (req, ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = Number(id);

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw ApiErrors.NotFound('User');
  }

  const body = await req.json();
  const parsed = resetPasswordSchema.parse(body);

  const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
  const now = Math.floor(Date.now() / 1000);

  await db.update(users)
    .set({
      passwordHash,
      passwordChangedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .run();

  return NextResponse.json({ success: true, message: 'Password reset successfully' });
}, { requireAdmin: true });