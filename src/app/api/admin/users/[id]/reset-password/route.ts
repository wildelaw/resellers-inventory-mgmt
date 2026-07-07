import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { resetPasswordSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const uid = Number(id);
    if (!Number.isInteger(uid) || uid <= 0) throw ApiErrors.BadRequest('Invalid id');
    const target = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!target) throw ApiErrors.NotFound('User');

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    // Update password + passwordChangedAt → invalidates all existing sessions.
    db.update(users)
      .set({ passwordHash: hash, passwordChangedAt: sql`(unixepoch())`, updatedAt: sql`(unixepoch())` })
      .where(eq(users.id, uid))
      .run();

    return NextResponse.json({ message: 'Password reset. All sessions for this user have been invalidated.' });
  }, { requireAdmin: true })(req, ctx);
}
