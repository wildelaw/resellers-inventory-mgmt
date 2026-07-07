import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { updateProfileSchema, passwordSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function GET() {
  return withAuth(async (_req, _ctx, session) => {
    const uid = sessionUserId(session);
    const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!user) throw ApiErrors.NotFound('User');
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        canViewAll: user.canViewAll,
      },
    });
  })(new NextRequest('http://localhost/api/profile'), { params: Promise.resolve({}) });
}

export async function PUT(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const uid = sessionUserId(session);
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.type === 'profile') {
      if (!data.name) throw ApiErrors.BadRequest('Name is required');
      const updated = db.update(users)
        .set({ name: data.name, updatedAt: sql`(unixepoch())` })
        .where(eq(users.id, uid))
        .returning();
      return NextResponse.json({ user: { id: updated[0].id, email: updated[0].email, name: updated[0].name, role: updated[0].role, canViewAll: updated[0].canViewAll } });
    }

    if (data.type === 'password') {
      if (!data.currentPassword || !data.newPassword) throw ApiErrors.BadRequest('currentPassword and newPassword required');
      const pwCheck = passwordSchema.safeParse(data.newPassword);
      if (!pwCheck.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: pwCheck.error.issues.map((i) => i.message) },
          { status: 400 },
        );
      }
      const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
      if (!user) throw ApiErrors.NotFound('User');
      const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!ok) throw ApiErrors.BadRequest('Current password is incorrect');

      const hash = await bcrypt.hash(data.newPassword, 10);
      db.update(users)
        .set({ passwordHash: hash, passwordChangedAt: sql`(unixepoch())`, updatedAt: sql`(unixepoch())` })
        .where(eq(users.id, uid))
        .run();
      return NextResponse.json({ message: 'Password updated. All existing sessions have been invalidated.' });
    }

    throw ApiErrors.BadRequest('Invalid update type');
  })(req, { params: Promise.resolve({}) });
}
