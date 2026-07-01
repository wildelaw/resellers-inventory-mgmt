import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset a user's password (admin only)
 * This also invalidates all existing sessions for that user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      throw ApiErrors.BadRequest('Invalid user ID');
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      throw ApiErrors.NotFound('User');
    }

    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const { newPassword } = validation.data;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and passwordChangedAt (invalidates all sessions)
    await db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      message: 'Password reset successfully. All existing sessions have been invalidated.',
    });
  }, { requireAdmin: true })(req, { params });
}
