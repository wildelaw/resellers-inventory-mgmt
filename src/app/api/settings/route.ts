import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { updateSettingsSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (_req, _ctx, _session) => {
  const settings = await db.select().from(appConfig).where(eq(appConfig.id, 1)).get();

  if (!settings) {
    throw ApiErrors.NotFound('Settings');
  }

  return NextResponse.json(settings);
});

export const PUT = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = updateSettingsSchema.parse(body);

  const settings = await db.select().from(appConfig).where(eq(appConfig.id, 1)).get();
  if (!settings) {
    throw ApiErrors.NotFound('Settings');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (parsed.company_name !== undefined) {
    updateData.companyName = parsed.company_name;
  }
  if (parsed.company_tagline !== undefined) {
    updateData.companyTagline = parsed.company_tagline;
  }
  if (parsed.sales_tax_rate !== undefined) {
    updateData.salesTaxRate = parsed.sales_tax_rate;
  }

  const result = await db.update(appConfig)
    .set(updateData)
    .where(eq(appConfig.id, 1))
    .returning().get();

  return NextResponse.json(result);
}, { requireAdmin: true });