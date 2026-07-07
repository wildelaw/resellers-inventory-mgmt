import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { unlockSetup } from '@/lib/db-init';
import { handleApiError } from '@/lib/api-errors';

// POST - Re-open setup
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      await unlockSetup();
      return NextResponse.json({ success: true, message: 'Setup unlocked' });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}