import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { resetPasswordSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

// POST /api/admin/users/[id]/reset-password — admin resets password,
// also invalidates all sessions via passwordChangedAt.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return ApiErrors.BadRequest('Invalid id').toResponse();

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return ApiErrors.NotFound('User').toResponse();

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    const now = Date.now();
    const ts = Math.floor(now / 1000); // passwordChangedAt in seconds
    db.update(users)
      .set({ passwordHash: newHash, passwordChangedAt: ts, updatedAt: now })
      .where(eq(users.id, id))
      .run();

    return NextResponse.json({ success: true });
  }, { requireAdmin: true })(req, ctx);
}