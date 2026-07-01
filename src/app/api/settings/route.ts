import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { updateSettingsSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, _ctx, _session: Session) => {
  let settings = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (settings.length === 0) {
    // Create default row
    await db.insert(appConfig).values({
      id: 1,
      setupComplete: 0,
      updatedAt: nowTimestamp(),
    });
    settings = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  }

  const s = settings[0];
  return NextResponse.json({
    company_name: s.companyName,
    company_tagline: s.companyTagline,
    sales_tax_rate: s.salesTaxRate,
    setup_complete: s.setupComplete === 1,
  });
});

export const PUT = withAuth(async (req: NextRequest, _ctx, _session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = updateSettingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const data = validation.data;
  const update: Record<string, unknown> = { updatedAt: nowTimestamp() };
  if (data.companyName !== undefined) update.companyName = data.companyName;
  if (data.companyTagline !== undefined) update.companyTagline = data.companyTagline;
  if (data.salesTaxRate !== undefined) update.salesTaxRate = data.salesTaxRate;

  await db.update(appConfig).set(update).where(eq(appConfig.id, 1));
  return NextResponse.json({ success: true });
}, { requireAdmin: true });