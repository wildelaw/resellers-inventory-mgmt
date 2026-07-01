import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';
import { handleApiError } from '@/lib/api-errors';

/**
 * GET /api/admin/backup
 * Export all data as JSON backup (admin only)
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const backup = await exportBackup();

    const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }, { requireAdmin: true })(req);
}
