import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { restoreBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// POST /api/admin/restore — validate + restore in transaction
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const result = await restoreBackup(body);
    return NextResponse.json({ success: true, counts: result.counts });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}