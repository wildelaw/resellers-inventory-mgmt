import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';

// POST /api/admin/users/:id/reset-password — resets the password AND updates
// passwordChangedAt, invalidating all of the user's existing sessions.
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx!.params;
  const userId = Number(id);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw ApiErrors.NotFound('User');

  const body = await readJsonBody(req);
  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
  await db.update(users).set({
    passwordHash,
    passwordChangedAt: Math.floor(Date.now() / 1000),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    message: "Password reset. The user's existing sessions have been invalidated.",
  });
}, { requireAdmin: true });