import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const POST = withAuth(async (req: NextRequest, ctx, _session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) throw ApiErrors.BadRequest('Invalid user ID');

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw ApiErrors.NotFound('User');

  const body = await req.json();
  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
  const now = nowTimestamp();

  // Update password and passwordChangedAt (invalidates all existing sessions)
  await db.update(users).set({
    passwordHash,
    passwordChangedAt: now,
    updatedAt: now,
  }).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}, { requireAdmin: true });