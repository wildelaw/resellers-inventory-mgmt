import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { updateSettingsSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const config = await db.query.appConfig.findFirst();
    if (!config) {
      return NextResponse.json({ company_name: 'Resale Manager', company_tagline: '', sales_tax_rate: 0.0825, setup_complete: false });
    }
    return NextResponse.json({ company_name: config.companyName, company_tagline: config.companyTagline, sales_tax_rate: config.salesTaxRate, setup_complete: config.setupComplete === 1 });
  });
}

export async function PUT(req: NextRequest) {
  return withAuth(req, async (session) => {
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = updateSettingsSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });

    const now = Math.floor(Date.now() / 1000);
    const existing = await db.query.appConfig.findFirst();
    if (existing) {
      await db.update(appConfig).set({ ...validation.data, updatedAt: now }).where(eq(appConfig.id, 1));
    } else {
      await db.insert(appConfig).values({ ...validation.data, setupComplete: 1, updatedAt: now });
    }

    const updated = await db.query.appConfig.findFirst();
    return NextResponse.json({ company_name: updated!.companyName, company_tagline: updated!.companyTagline, sales_tax_rate: updated!.salesTaxRate, setup_complete: updated!.setupComplete === 1 });
  });
}
