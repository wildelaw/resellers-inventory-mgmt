import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const POST = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  await db.update(appConfig).set({
    setupComplete: false,
    updatedAt: new Date(),
  }).where(eq(appConfig.id, 1));

  return NextResponse.json({ message: 'Setup unlocked' });
});