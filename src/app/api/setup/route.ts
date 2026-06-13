import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus, lockSetup } from '@/lib/db-init';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { setupCreateAdminSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import bcrypt from 'bcrypt';
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
    const status = await getSetupStatus();
    if (!status.needsSetup) {
      throw ApiErrors.Forbidden();
    }

    const body = await req.json();
    const validation = setupCreateAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    }

    const { name, email, password } = validation.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);

    const existingConfig = await db.query.appConfig.findFirst();
    if (!existingConfig) {
      await db.insert(appConfig).values({ companyName: 'Resale Manager', companyTagline: '', salesTaxRate: 0.0825, setupComplete: 0, updatedAt: now });
    }

    const result = await db.insert(users).values({ email, passwordHash, name, role: 'admin', canViewAll: 1, isActive: 1, passwordChangedAt: 0, createdAt: now, updatedAt: now }).returning() as any[];
    await lockSetup();

    return NextResponse.json({ message: 'Admin account created', user: { id: result[0].id, email: result[0].email, name: result[0].name, role: result[0].role } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBackup(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Backup validation failed', details: validation.errors }, { status: 400 });
    }
    await restoreBackup(validation.data);
    await lockSetup();
    return NextResponse.json({ message: 'Backup restored successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
