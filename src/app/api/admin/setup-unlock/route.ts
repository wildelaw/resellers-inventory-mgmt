import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { unlockSetup } from '@/lib/db-init';
import { handleApiError } from '@/lib/api-errors';

/**
 * POST /api/admin/setup-unlock
 * Re-open the setup endpoint (admin only)
 * Used for disaster recovery scenarios
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    await unlockSetup();

    return NextResponse.json({
      message: 'Setup unlocked successfully',
    });
  }, { requireAdmin: true })(req);
}
