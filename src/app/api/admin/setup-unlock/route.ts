import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const POST = withAuth(async (req: NextRequest, _ctx, _session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  await db.update(appConfig)
    .set({ setupComplete: 0, updatedAt: nowTimestamp() })
    .where(eq(appConfig.id, 1));

  return NextResponse.json({ success: true });
}, { requireAdmin: true });