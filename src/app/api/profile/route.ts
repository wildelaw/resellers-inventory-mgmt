import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { profileUpdateSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const GET = withAuth(async (_req, _ctx, session) => {
  const uid = currentUserId(session);
  const user = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
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

export const PUT = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const uid = currentUserId(session);
  const existing = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
  if (!existing) throw ApiErrors.NotFound('User');

  const body = await req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.type === 'profile') {
    db.update(users).set({ name: data.name, updatedAt: nowTs() }).where(eq(users.id, uid)).run();
    return NextResponse.json({ success: true });
  }

  // type === 'password'
  const ok = await bcrypt.compare(data.currentPassword, existing.passwordHash);
  if (!ok) throw ApiErrors.BadRequest('Current password is incorrect');

  const passwordHash = await hashPassword(data.newPassword);
  // Update passwordChangedAt -> invalidates all existing JWTs (iat < passwordChangedAt).
  db.update(users).set({
    passwordHash,
    passwordChangedAt: nowTs(),
    updatedAt: nowTs(),
  }).where(eq(users.id, uid)).run();

  return NextResponse.json({ success: true });
});