import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { handleApiError } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { getSetupStatus, isSetupComplete } from '@/lib/db-init';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { setupAdminSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { restoreBackup } from '@/lib/backup';

// GET /api/setup — setup status (no auth required)
export async function GET() {
  const status = await getSetupStatus();
  return NextResponse.json(status);
}

// POST /api/setup — create the initial admin (no auth; only when needsSetup).
// This handler deliberately does NOT use withAuth: the whole point is that no
// session exists yet. Origin/Referer validation is exempted for this route.
export async function POST(req: NextRequest) {
  try {
    const status = await getSetupStatus();
    if (status.hasUsers) {
      throw ApiErrors.Conflict('Setup is already complete');
    }

    const body = await readJsonBody(req);
    const validation = setupAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const result = db.transaction((tx) => {
      // Re-check inside the transaction to prevent a race creating two admins
      const [{ count }] = tx.select({ count: sql<number>`count(*)` }).from(users).all();
      if (Number(count) > 0) {
        throw ApiErrors.Conflict('Setup is already complete');
      }

      const inserted = tx.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'admin',
        canViewAll: true,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      // Lock setup permanently via app_config
      const config = tx.select().from(appConfig).limit(1).all();
      if (config.length === 0) {
        tx.insert(appConfig).values({
          id: 1,
          setupComplete: true,
          updatedAt: now,
        }).run();
      } else {
        tx.update(appConfig).set({ setupComplete: true, updatedAt: now }).run();
      }

      return inserted[0];
    });

    return NextResponse.json({
      message: 'Admin account created',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/setup — restore from backup. Open (unauthenticated) only while
// setup is unlocked (no users exist); once locked, requires an admin session.
export async function PUT(req: NextRequest) {
  try {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const setupComplete = await isSetupComplete();
    if (setupComplete) {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();
      if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
    }

    const body = await readJsonBody(req);
    const result = await restoreBackup(body);
    return NextResponse.json({ message: 'Backup restored', ...result });
  } catch (error) {
    return handleApiError(error);
  }
}