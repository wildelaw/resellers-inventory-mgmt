import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus, ensureAppConfigRow } from '@/lib/db-init';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { setupSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { validateOriginOrReferer } from '@/lib/api-utils';
import { withAuth } from '@/lib/api-utils';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nowTimestamp } from '@/lib/utils';
import { restoreBackup } from '@/lib/backup';

export async function GET() {
  const status = await getSetupStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  try {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const status = await getSetupStatus();
    if (!status.needsSetup) {
      throw ApiErrors.Forbidden();
    }

    const body = await req.json();
    const validation = setupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
        { status: 400 },
      );
    }

    const { name, email, password } = validation.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = nowTimestamp();

    await ensureAppConfigRow();

    const user = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'admin',
      canViewAll: 1,
      isActive: 1,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Lock setup
    await db.update(appConfig)
      .set({ setupComplete: 1, updatedAt: now })
      .where(eq(appConfig.id, 1));

    return NextResponse.json({
      message: 'Admin account created',
      user: {
        id: String(user[0].id),
        email: user[0].email,
        name: user[0].name,
        role: user[0].role,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = withAuth(async (req: NextRequest, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const result = await restoreBackup(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Restore failed', details: result.errors }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}, { requireAdmin: true });