import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { profileUpdateSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

// GET /api/profile
export async function GET() {
  return withAuth(async (req, _ctx, session) => {
    const user = db.select().from(users).where(eq(users.id, Number(session.user.id))).get();
    if (!user) return ApiErrors.NotFound('User').toResponse();
    return NextResponse.json({
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
        canViewAll: user.canViewAll,
      },
    });
  })(new NextRequest('http://localhost/api/profile'), { params: Promise.resolve({}) });
}

// PUT /api/profile — update name or change password
export async function PUT(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;
    const uid = Number(session.user.id);
    const user = db.select().from(users).where(eq(users.id, uid)).get();
    if (!user) return ApiErrors.NotFound('User').toResponse();

    if (data.type === 'profile') {
      const update: Record<string, unknown> = { updatedAt: Date.now() };
      if (data.name !== undefined) update.name = data.name;
      const updated = db.update(users).set(update).where(eq(users.id, uid)).returning().get();
      return NextResponse.json({
        user: {
          id: String(updated.id),
          email: updated.email,
          name: updated.name,
          role: updated.role,
          canViewAll: updated.canViewAll,
        },
      });
    }

    // type === 'password'
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) {
      return ApiErrors.BadRequest('Current password is incorrect').toResponse();
    }
    const newHash = await bcrypt.hash(data.newPassword, 10);
    const now = Date.now();
    const ts = Math.floor(now / 1000); // passwordChangedAt is in seconds
    db.update(users)
      .set({ passwordHash: newHash, passwordChangedAt: ts, updatedAt: now })
      .where(eq(users.id, uid))
      .run();
    return NextResponse.json({ success: true });
  })(req, { params: Promise.resolve({}) });
}