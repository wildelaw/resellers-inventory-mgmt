import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { profileUpdateSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

// GET /api/profile — current user's profile
export const GET = withAuth(async (req, ctx, session) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionUserId(session)),
    columns: {
      id: true, email: true, name: true, role: true, canViewAll: true,
      createdAt: true, lastLogin: true,
    },
  });
  if (!user) throw ApiErrors.NotFound('User');
  return NextResponse.json({ user });
});

// PUT /api/profile — update name or change password.
// A password change updates passwordChangedAt, invalidating all existing
// sessions for the user (JWTs with iat < passwordChangedAt are rejected).
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = profileUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const userId = sessionUserId(session);
  const now = new Date();

  if (validation.data.type === 'profile') {
    await db.update(users).set({ name: validation.data.name, updatedAt: now }).where(eq(users.id, userId));
    return NextResponse.json({ success: true, message: 'Profile updated' });
  }

  // type === 'password'
  const { currentPassword, newPassword } = validation.data;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw ApiErrors.NotFound('User');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiErrors.BadRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({
    passwordHash,
    passwordChangedAt: Math.floor(now.getTime() / 1000),
    updatedAt: now,
  }).where(eq(users.id, userId));

  return NextResponse.json({ success: true, message: 'Password updated. Please sign in again.' });
});