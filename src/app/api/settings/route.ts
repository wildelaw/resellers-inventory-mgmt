import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { updateSettingsSchema } from '@/lib/validations';
import { getAppConfig } from '@/lib/db-init';

// GET /api/settings — any authenticated user
export const GET = withAuth(async (req, ctx, session) => {
  const config = await getAppConfig();
  return NextResponse.json({
    company_name: config.companyName,
    company_tagline: config.companyTagline,
    sales_tax_rate: config.salesTaxRate,
    setup_complete: config.setupComplete,
  });
});

// PUT /api/settings — admin only
export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = updateSettingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  await getAppConfig(); // ensure row exists

  const updated = await db.update(appConfig).set({
    ...(validation.data.company_name !== undefined ? { companyName: validation.data.company_name } : {}),
    ...(validation.data.company_tagline !== undefined ? { companyTagline: validation.data.company_tagline } : {}),
    ...(validation.data.sales_tax_rate !== undefined ? { salesTaxRate: validation.data.sales_tax_rate } : {}),
    updatedAt: new Date(),
  }).where(eq(appConfig.id, 1)).returning();

  const config = updated[0];
  return NextResponse.json({
    company_name: config.companyName,
    company_tagline: config.companyTagline,
    sales_tax_rate: config.salesTaxRate,
    setup_complete: config.setupComplete,
  });
}, { requireAdmin: true });