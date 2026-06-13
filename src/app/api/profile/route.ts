import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { updateProfileSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const GET = withAuth(async (_req, _ctx, session) => {
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    canViewAll: users.canViewAll,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, Number(session.user.id))).get();

  if (!user) {
    throw ApiErrors.NotFound('User');
  }

  return NextResponse.json(user);
});

export const PUT = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = updateProfileSchema.parse(body);
  const userId = Number(session.user.id);

  if (parsed.type === 'profile') {
    await db.update(users)
      .set({ name: parsed.name, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, userId))
      .run();

    const updated = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canViewAll: users.canViewAll,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).get();

    return NextResponse.json(updated);
  }

  if (parsed.type === 'password') {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw ApiErrors.NotFound('User');
    }

    const isValid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!isValid) {
      throw ApiErrors.BadRequest('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(parsed.newPassword, 12);
    const now = Math.floor(Date.now() / 1000);

    await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .run();

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  }

  throw ApiErrors.BadRequest('Invalid update type');
});