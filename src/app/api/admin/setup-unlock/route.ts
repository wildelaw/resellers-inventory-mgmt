import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { unlockSetup } from '@/lib/db-init';

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    await unlockSetup();
    return NextResponse.json({ message: 'Setup unlocked' });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}
