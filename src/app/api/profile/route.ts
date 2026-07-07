import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateProfileSchema, passwordSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp } from '@/lib/utils';

// GET - Get profile
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(session.user.id)),
      });

      if (!user) throw ApiErrors.NotFound('User');

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          canViewAll: user.canViewAll,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// PUT - Update profile or password
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = updateProfileSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const userId = Number(session.user.id);

      if (data.type === 'profile') {
        await db.update(users)
          .set({ name: data.name!, updatedAt: nowTimestamp() })
          .where(eq(users.id, userId));

        return NextResponse.json({ success: true });
      } else if (data.type === 'password') {
        // Verify current password
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) throw ApiErrors.NotFound('User');

        const valid = await bcrypt.compare(data.currentPassword!, user.passwordHash);
        if (!valid) {
          throw ApiErrors.BadRequest('Current password is incorrect');
        }

        // Validate new password
        const newPassValidation = passwordSchema.safeParse(data.newPassword);
        if (!newPassValidation.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: newPassValidation.error.issues.map(e => e.message) },
            { status: 400 }
          );
        }

        const newHash = await bcrypt.hash(data.newPassword!, 10);
        const now = nowTimestamp();

        await db.update(users)
          .set({
            passwordHash: newHash,
            passwordChangedAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, userId));

        return NextResponse.json({ success: true });
      }

      throw ApiErrors.BadRequest('Invalid update type');
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}