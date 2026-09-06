import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { getAppConfig } from '@/lib/db-init';

// POST /api/admin/setup-unlock — re-open initial setup (admin only)
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  await getAppConfig(); // ensure row exists

  await db.update(appConfig).set({
    setupComplete: false,
    updatedAt: new Date(),
  }).where(eq(appConfig.id, 1));

  return NextResponse.json({ success: true, message: 'Setup has been re-opened' });
}, { requireAdmin: true });