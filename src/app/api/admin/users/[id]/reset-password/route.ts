import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { resetPasswordSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp } from '@/lib/utils';

// POST - Reset user password
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const { id } = await ctx.params;
      const userId = Number(id);

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) throw ApiErrors.NotFound('User');

      const body = await req.json();
      const validation = resetPasswordSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const newHash = await bcrypt.hash(validation.data.newPassword, 10);
      const now = nowTimestamp();

      // Update password and passwordChangedAt to invalidate all existing sessions
      await db.update(users)
        .set({
          passwordHash: newHash,
          passwordChangedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, ctx);
}