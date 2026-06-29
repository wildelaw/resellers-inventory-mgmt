import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateSettingsSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { ensureAppConfigRow } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

// GET /api/settings — any authenticated user
export async function GET() {
  return withAuth(async (req, _ctx, _session) => {
    const cfg = await ensureAppConfigRow();
    return NextResponse.json({
      company_name: cfg.companyName,
      company_tagline: cfg.companyTagline,
      sales_tax_rate: cfg.salesTaxRate,
      setup_complete: cfg.setupComplete,
    });
  })(new NextRequest('http://localhost/api/settings'), { params: Promise.resolve({}) });
}

// PUT /api/settings — admin only
export async function PUT(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;
    const existing = await ensureAppConfigRow();
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.companyName !== undefined) update.companyName = data.companyName;
    if (data.companyTagline !== undefined) update.companyTagline = data.companyTagline;
    if (data.salesTaxRate !== undefined) update.salesTaxRate = data.salesTaxRate;
    const updated = db.update(appConfig).set(update).where(eq(appConfig.id, 1)).returning().get();
    return NextResponse.json({
      company_name: updated.companyName,
      company_tagline: updated.companyTagline,
      sales_tax_rate: updated.salesTaxRate,
      setup_complete: updated.setupComplete,
    });
  })(req, { params: Promise.resolve({}) });
}