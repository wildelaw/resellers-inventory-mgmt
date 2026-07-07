import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateSettingsSchema } from '@/lib/validations';
import { handleApiError } from '@/lib/api-errors';
import { ensureAppConfig } from '@/lib/db-init';
import { nowTimestamp } from '@/lib/utils';

// GET - Get settings
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      await ensureAppConfig();
      const settings = await db.select().from(appConfig).limit(1);

      return NextResponse.json({
        company_name: settings[0]?.companyName ?? 'Resale Manager',
        company_tagline: settings[0]?.companyTagline ?? '',
        sales_tax_rate: settings[0]?.salesTaxRate ?? 0.0825,
        setup_complete: settings[0]?.setupComplete ?? false,
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}

// PUT - Update settings (admin only)
export async function PUT(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = updateSettingsSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const data = validation.data;
      const updateData: Record<string, any> = { updatedAt: nowTimestamp() };

      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.companyTagline !== undefined) updateData.companyTagline = data.companyTagline;
      if (data.salesTaxRate !== undefined) updateData.salesTaxRate = data.salesTaxRate;

      await ensureAppConfig();
      await db.update(appConfig)
        .set(updateData)
        .where(eq(appConfig.id, 1));

      const updated = await db.select().from(appConfig).limit(1);

      return NextResponse.json({
        company_name: updated[0]?.companyName,
        company_tagline: updated[0]?.companyTagline,
        sales_tax_rate: updated[0]?.salesTaxRate,
        setup_complete: updated[0]?.setupComplete,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}