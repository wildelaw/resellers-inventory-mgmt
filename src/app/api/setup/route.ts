import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { getSetupStatus, ensureAppConfigRow, lockSetup } from '@/lib/db-init';
import { setupSchema } from '@/lib/validations';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { validateBackup, restoreBackup } from '@/lib/backup';

export async function GET() {
  try {
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { needsSetup } = await getSetupStatus();
    if (!needsSetup) throw ApiErrors.Forbidden('Setup is locked');

    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const hash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);

    const created = db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash: hash,
        name,
        role: 'admin',
        canViewAll: true,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await lockSetup();

    return NextResponse.json(
      {
        message: 'Admin account created',
        user: { id: String(created[0].id), email: created[0].email, name: created[0].name, role: created[0].role },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  // Restore from backup during initial setup (requires admin auth).
  return withAuth(async (req, ctx, session) => {
    if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validated = validateBackup(body);
    await restoreBackup(validated);
    return NextResponse.json({ message: 'Backup restored successfully' });
  })(req, { params: Promise.resolve({}) });
}
