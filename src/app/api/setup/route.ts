import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { setupSchema } from '@/lib/validations';
import { getSetupStatus, lockSetup, ensureAppConfig } from '@/lib/db-init';
import { runMigrations } from '@/lib/migrate';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { exportBackup, validateBackup, restoreBackup } from '@/lib/backup';
import { nowTimestamp } from '@/lib/utils';

// GET - Check setup status (no auth required)
export async function GET() {
  try {
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create initial admin (no auth required, only when needsSetup)
export async function POST(req: NextRequest) {
  try {
    // Run migrations to ensure tables exist
    await runMigrations();

    const status = await getSetupStatus();
    if (!status.needsSetup) {
      throw ApiErrors.Forbidden('Setup is already complete');
    }

    const body = await req.json();
    const validation = setupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existing) {
      throw ApiErrors.Conflict('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = nowTimestamp();

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Ensure app_config exists and lock setup
    await ensureAppConfig();
    await lockSetup();

    return NextResponse.json({
      message: 'Admin account created',
      user: {
        id: String(newUser[0].id),
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Restore from backup during setup (requires admin)
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = validateBackup(body);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Backup validation failed', details: validation.errors },
          { status: 400 }
        );
      }

      await restoreBackup(body as any);
      return NextResponse.json({ message: 'Backup restored successfully' });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}