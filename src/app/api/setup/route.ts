import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { getSetupStatus, markSetupComplete, ensureAppConfigRow } from '@/lib/db-init';
import { runMigrations } from '@/lib/migrate';
import { setupSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { validateOriginOrReferer } from '@/lib/api-utils';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { restoreBackup } from '@/lib/backup';
import { withAuth } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/setup — check setup status
export async function GET() {
  try {
    // Ensure DB is initialized and migrations are runnable
    void db;
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/setup — create initial admin (only when needsSetup)
export async function POST(req: NextRequest) {
  try {
    // Origin check is still required, but auth is not
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    void db;
    runMigrations();
    const status = await getSetupStatus();
    if (status.setupComplete || status.hasUsers) {
      return ApiErrors.Forbidden('Setup is already complete').toResponse();
    }

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const { name, email, password } = parsed.data;

    // Ensure no duplicate
    const existing = db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return ApiErrors.Conflict('Email already in use').toResponse();
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();
    const created = db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role: 'admin',
        canViewAll: true,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
      })
      .returning()
      .get();

    await ensureAppConfigRow();
    await markSetupComplete();

    return NextResponse.json(
      {
        message: 'Admin account created',
        user: {
          id: String(created.id),
          email: created.email,
          name: created.name,
          role: created.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/setup — restore from backup (admin only, accessible during setup)
export const PUT = withAuth(async (req) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const result = await restoreBackup(body);
  // Re-lock setup after restore
  await markSetupComplete();
  return NextResponse.json({ success: true, counts: result.counts });
}, { requireAdmin: true });