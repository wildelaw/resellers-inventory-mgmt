import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { resetPasswordSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const POST = withAuth(async (req, ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');

  const existing = db.query.users.findFirst({ where: eq(users.id, uid) }).sync();
  if (!existing) throw ApiErrors.NotFound('User');

  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  // Updating passwordChangedAt invalidates all existing sessions for this user.
  db.update(users).set({
    passwordHash,
    passwordChangedAt: nowTs(),
    updatedAt: nowTs(),
  }).where(eq(users.id, uid)).run();

  return NextResponse.json({ success: true });
}, { requireAdmin: true });