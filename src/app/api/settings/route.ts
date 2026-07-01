import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { updateSettingsSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

/**
 * GET /api/settings
 * Get application settings
 * Any authenticated user can view settings
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const settings = await db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        companyName: 'Resale Manager',
        companyTagline: '',
        salesTaxRate: 0.0825,
        setupComplete: false,
      });
    }

    return NextResponse.json({
      companyName: settings.companyName,
      companyTagline: settings.companyTagline,
      salesTaxRate: settings.salesTaxRate,
      setupComplete: settings.setupComplete,
    });
  })(req);
}

/**
 * PUT /api/settings
 * Update application settings
 * Admin only
 */
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    // Check if settings exist
    const existing = await db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });

    if (existing) {
      await db
        .update(appConfig)
        .set({
          ...validation.data,
          updatedAt: new Date(),
        })
        .where(eq(appConfig.id, 1));
    } else {
      await db.insert(appConfig).values({
        id: 1,
        ...validation.data,
        setupComplete: false,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
    });
  }, { requireAdmin: true })(req);
}
