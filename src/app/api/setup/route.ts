import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, appConfig, fromBool, nowTs } from '@/lib/schema';
import { getSetupStatus, lockSetup } from '@/lib/db-init';
import { setupSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { validateOriginOrReferer, withAuth } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import { buildBackup, validateBackup, restoreBackup } from '@/lib/backup';
import { runMigrationsIfDue } from '@/lib/migrate';

/** GET /api/setup — setup status (public). */
export async function GET() {
  try {
    const status = await getSetupStatus();
    return NextResponse.json({ needsSetup: status.needsSetup, hasUsers: status.hasUsers });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/setup — create the initial admin (public only when needsSetup). */
export async function POST(req: NextRequest) {
  try {
    // Origin check still applies (mutation), but /api/setup is exempt during setup.
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    await runMigrationsIfDue();
    const status = await getSetupStatus();
    if (!status.needsSetup) {
      throw ApiErrors.Forbidden('Setup is locked');
    }

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    const { name, email, password } = parsed.data;

    const existing = db.select().from(users).where(eq(users.email, email)).all();
    if (existing.length > 0) throw ApiErrors.Conflict('Email already registered');

    const passwordHash = await hashPassword(password);
    const ts = nowTs();
    const created = db.insert(users).values({
      email, passwordHash, name, role: 'admin',
      canViewAll: fromBool(true), isActive: 1,
      passwordChangedAt: 0, createdAt: ts, updatedAt: ts,
    }).returning().all();

    // Lock setup.
    const cfg = db.select().from(appConfig).where(eq(appConfig.id, 1)).all();
    if (cfg.length === 0) {
      db.insert(appConfig).values({ id: 1, setupComplete: 1, updatedAt: ts }).run();
    } else {
      lockSetup();
    }

    const user = created[0];
    return NextResponse.json({
      message: 'Admin account created',
      user: { id: String(user.id), email: user.email, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/setup — restore from backup during initial setup (admin-only). */
export const PUT = withAuth(async (req) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const errors = validateBackup(body);
  if (errors) {
    return NextResponse.json({ error: 'Backup validation failed', code: 'BAD_REQUEST', details: errors }, { status: 400 });
  }
  await restoreBackup(body as Awaited<ReturnType<typeof buildBackup>>);
  return NextResponse.json({ success: true });
}, { requireAdmin: true });