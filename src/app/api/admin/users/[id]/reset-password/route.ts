import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const POST = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const userId = parseInt(id);

  const body = await req.json();
  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
  await db.update(users).set({
    passwordHash,
    passwordChangedAt: Math.floor(Date.now() / 1000),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return NextResponse.json({ message: 'Password reset successfully. All sessions for this user have been invalidated.' });
});