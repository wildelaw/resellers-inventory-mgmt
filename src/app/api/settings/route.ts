import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { settingsSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const config = await db.select().from(appConfig).where(eq(appConfig.id, 1));
  if (!config.length) {
    return NextResponse.json({
      company_name: 'Resale Manager',
      company_tagline: '',
      sales_tax_rate: 0.0825,
      setup_complete: false,
    });
  }
  const c = config[0];
  return NextResponse.json({
    company_name: c.companyName ?? 'Resale Manager',
    company_tagline: c.companyTagline ?? '',
    sales_tax_rate: c.salesTaxRate ?? 0.0825,
    setup_complete: c.setupComplete,
  });
});

export const PUT = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = settingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  await db.update(appConfig).set({
    ...validation.data,
    updatedAt: new Date(),
  }).where(eq(appConfig.id, 1));

  const updated = await db.select().from(appConfig).where(eq(appConfig.id, 1));
  const c = updated[0];
  return NextResponse.json({
    company_name: c.companyName ?? 'Resale Manager',
    company_tagline: c.companyTagline ?? '',
    sales_tax_rate: c.salesTaxRate ?? 0.0825,
    setup_complete: c.setupComplete,
  });
});