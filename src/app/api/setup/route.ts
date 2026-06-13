import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus, lockSetup } from '@/lib/db-init';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { setupSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

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
      throw ApiErrors.Conflict('Setup has already been completed');
    }

    const body = await req.json();
    const parsed = setupSchema.parse(body);

    const existingUser = await db.select().from(users).where(eq(users.email, parsed.email)).get();
    if (existingUser) {
      throw ApiErrors.Conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    await db.insert(users).values({
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: 'admin',
      canViewAll: 1,
      isActive: 1,
    });

    await lockSetup();

    return NextResponse.json({ success: true, message: 'Admin user created and setup locked' }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const { restoreBackup } = await import('@/lib/backup');
  const result = await restoreBackup(body);

  return NextResponse.json(result);
}, { requireAdmin: true });