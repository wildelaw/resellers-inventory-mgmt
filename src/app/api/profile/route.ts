import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { updateProfileSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, _ctx, session: Session) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, parseInt(session.user.id, 10)) });
  if (!user) throw ApiErrors.NotFound('User');

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      canViewAll: user.canViewAll === 1,
    },
  });
});

export const PUT = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const userId = parseInt(session.user.id, 10);
  const now = nowTimestamp();

  if (data.type === 'profile') {
    if (!data.name) throw ApiErrors.BadRequest('Name is required');
    await db.update(users).set({ name: data.name, updatedAt: now }).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  }

  if (data.type === 'password') {
    if (!data.currentPassword || !data.newPassword) {
      throw ApiErrors.BadRequest('Current and new password are required');
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw ApiErrors.NotFound('User');

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw ApiErrors.BadRequest('Current password is incorrect');

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await db.update(users).set({
      passwordHash: newHash,
      passwordChangedAt: now,
      updatedAt: now,
    }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  }

  throw ApiErrors.BadRequest('Invalid update type');
});