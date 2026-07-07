import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { validateBackup, restoreBackup } from '@/lib/backup';
import { handleApiError } from '@/lib/api-errors';

// POST - Restore backup
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = validateBackup(body);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Backup validation failed', details: validation.errors },
          { status: 400 }
        );
      }

      await restoreBackup(body);
      return NextResponse.json({ message: 'Backup restored successfully' });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}