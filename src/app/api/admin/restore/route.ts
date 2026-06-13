import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { validateBackup, restoreBackup } from '@/lib/backup';

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = validateBackup(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Backup validation failed', details: validation.errors }, { status: 400 });
    }

    try {
      await restoreBackup(validation.data);
      return NextResponse.json({ message: 'Backup restored successfully' });
    } catch (error) {
      return NextResponse.json({ error: 'Restore failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  }, { requireAdmin: true });
}
