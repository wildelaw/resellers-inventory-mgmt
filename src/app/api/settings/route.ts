import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { ensureAppConfigRow } from '@/lib/db-init';
import { updateSettingsSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function GET() {
  return withAuth(async (_req, _ctx, _session) => {
    await ensureAppConfigRow();
    const cfg = await db.query.appConfig.findFirst();
    if (!cfg) throw ApiErrors.NotFound('Settings');
    return NextResponse.json({
      company_name: cfg.companyName,
      company_tagline: cfg.companyTagline,
      sales_tax_rate: cfg.salesTaxRate,
      setup_complete: cfg.setupComplete,
    });
  })(new NextRequest('http://localhost/api/settings'), { params: Promise.resolve({}) });
}

export async function PUT(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    await ensureAppConfigRow();
    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.companyName !== undefined) updateData.companyName = parsed.data.companyName;
    if (parsed.data.companyTagline !== undefined) updateData.companyTagline = parsed.data.companyTagline;
    if (parsed.data.salesTaxRate !== undefined) updateData.salesTaxRate = parsed.data.salesTaxRate;
    updateData.updatedAt = sql`(unixepoch())`;

    const updated = db.update(appConfig).set(updateData).where(eq(appConfig.id, 1)).returning();
    return NextResponse.json({
      company_name: updated[0].companyName,
      company_tagline: updated[0].companyTagline,
      sales_tax_rate: updated[0].salesTaxRate,
      setup_complete: updated[0].setupComplete,
    });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}
