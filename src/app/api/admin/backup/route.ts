import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const backup = await exportBackup();
    return NextResponse.json(backup);
  }, { requireAdmin: true });
}
