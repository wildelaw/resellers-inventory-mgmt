import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { getSetupStatus } from '@/lib/db-init';
import { setupSchema, passwordSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';
import { validateOriginOrReferer } from '@/lib/api-utils';

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
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const status = await getSetupStatus();
    if (!status.needsSetup) {
      return NextResponse.json({ error: 'Setup is already complete' }, { status: 403 });
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

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    }).returning() as any[];

    await db.insert(appConfig).values({
      id: 1,
      companyName: 'Resale Manager',
      companyTagline: '',
      salesTaxRate: 0.0825,
      setupComplete: true,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: appConfig.id,
      set: { setupComplete: true, updatedAt: now },
    });

    return NextResponse.json({
      message: 'Admin account created',
      user: { id: newUser[0].id, email: newUser[0].email, name: newUser[0].name, role: newUser[0].role },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const { validateBackup, restoreBackup } = await import('@/lib/backup');

    const result = validateBackup(body);
    if (!result.valid) {
      return NextResponse.json({ error: 'Invalid backup data', details: result.errors }, { status: 400 });
    }

    await restoreBackup(body);
    return NextResponse.json({ message: 'Backup restored successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}