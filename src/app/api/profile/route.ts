import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { profileUpdateSchema, changePasswordSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const GET = withAuth(async (req, ctx, session) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(session.user.id)),
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      canViewAll: user.canViewAll,
    },
  });
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = profileUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const userId = parseInt(session.user.id);

  if (validation.data.type === 'password') {
    const pwValidation = changePasswordSchema.safeParse(body);
    if (!pwValidation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: pwValidation.error.issues.map(e => e.message) },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isValid = await bcrypt.compare(pwValidation.data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(pwValidation.data.newPassword, 10);
    await db.update(users).set({
      passwordHash: newPasswordHash,
      passwordChangedAt: Math.floor(Date.now() / 1000),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return NextResponse.json({ message: 'Password updated successfully' });
  }

  if (validation.data.type === 'profile') {
    await db.update(users).set({
      name: validation.data.name,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return NextResponse.json({ message: 'Profile updated successfully' });
  }

  return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
});