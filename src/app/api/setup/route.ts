import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus, markSetupComplete } from '@/lib/db-init';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { setupSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { validateOriginOrReferer, withAuth } from '@/lib/api-utils';
import { runMigrations } from '@/lib/migrate';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { restoreBackup, validateBackup } from '@/lib/backup';

/**
 * GET /api/setup
 * Check if setup is needed
 * No authentication required
 */
export async function GET() {
  try {
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/setup
 * Create initial admin user
 * Only available when no users exist and setup is not locked
 */
export async function POST(req: NextRequest) {
  try {
    // Check setup status
    const status = await getSetupStatus();
    
    if (!status.needsSetup) {
      throw ApiErrors.Forbidden('Setup is already complete');
    }
    
    if (status.hasUsers) {
      throw ApiErrors.Forbidden('Users already exist');
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validation = setupSchema.safeParse(body);
    
    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }
    
    const { name, email, password } = validation.data;
    
    // Run migrations first
    await runMigrations();
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create admin user
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: new Date(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Mark setup as complete
    await markSetupComplete();
    
    return NextResponse.json({
      message: 'Admin account created',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/setup
 * Restore from backup during setup
 * Only available when setup is not locked
 */
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    
    // Only admin can restore during setup
    if (session.user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }
    
    const body = await req.json();
    
    // Validate backup data
    const validation = validateBackup(body);
    if (!validation.valid) {
      throw ApiErrors.ValidationError(
        'Backup validation failed',
        validation.errors
      );
    }
    
    // Run migrations first
    await runMigrations();
    
    // Restore backup
    await restoreBackup(body);
    
    // Mark setup as complete
    await markSetupComplete();
    
    return NextResponse.json({
      message: 'Backup restored successfully',
    });
  })(req);
}
