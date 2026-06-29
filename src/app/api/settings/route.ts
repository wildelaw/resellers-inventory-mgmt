import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appConfig, nowTs, toBool } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { updateSettingsSchema } from '@/lib/validations';

export const GET = withAuth(async () => {
  let row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
  if (!row) {
    db.insert(appConfig).values({ id: 1, updatedAt: nowTs() }).onConflictDoNothing().run();
    row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
  }
  return NextResponse.json({
    company_name: row!.companyName,
    company_tagline: row!.companyTagline,
    sales_tax_rate: row!.salesTaxRate,
    setup_complete: toBool(row!.setupComplete),
  });
});

export const PUT = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const update: Record<string, unknown> = { updatedAt: nowTs() };
  if (data.companyName !== undefined) update.companyName = data.companyName;
  if (data.companyTagline !== undefined) update.companyTagline = data.companyTagline;
  if (data.salesTaxRate !== undefined) update.salesTaxRate = data.salesTaxRate;

  db.update(appConfig).set(update).where(eq(appConfig.id, 1)).run();
  const row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
  return NextResponse.json({
    company_name: row!.companyName,
    company_tagline: row!.companyTagline,
    sales_tax_rate: row!.salesTaxRate,
    setup_complete: toBool(row!.setupComplete),
  });
}, { requireAdmin: true });