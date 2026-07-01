import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { updatePasswordSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(session.user.id)),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        canViewAll: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw ApiErrors.NotFound('User');
    }

    return NextResponse.json({ user });
  })(req);
}

/**
 * PUT /api/profile
 * Update profile or change password
 */
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const type = body.type;

    if (type === 'password') {
      // Change password
      const validation = updatePasswordSchema.safeParse(body);
      
      if (!validation.success) {
        throw ApiErrors.ValidationError(
          'Validation failed',
          validation.error.issues.map(i => i.message)
        );
      }

      const { currentPassword, newPassword } = validation.data;

      // Get current user with password hash
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(session.user.id)),
      });

      if (!user) {
        throw ApiErrors.NotFound('User');
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw ApiErrors.BadRequest('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password and passwordChangedAt
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(session.user.id)));

      return NextResponse.json({
        message: 'Password updated successfully',
      });
    } else if (type === 'profile') {
      // Update profile
      const { name } = body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw ApiErrors.BadRequest('Name is required');
      }

      if (name.length > 200) {
        throw ApiErrors.BadRequest('Name must be at most 200 characters');
      }

      await db
        .update(users)
        .set({
          name: name.trim(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(session.user.id)));

      return NextResponse.json({
        message: 'Profile updated successfully',
      });
    } else {
      throw ApiErrors.BadRequest('Invalid type. Must be "profile" or "password"');
    }
  })(req);
}
