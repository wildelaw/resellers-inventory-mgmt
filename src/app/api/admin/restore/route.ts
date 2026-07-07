import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { validateBackup, restoreBackup } from '@/lib/backup';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validated = validateBackup(body);
    await restoreBackup(validated);
    return NextResponse.json({ message: 'Backup restored successfully' });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}
