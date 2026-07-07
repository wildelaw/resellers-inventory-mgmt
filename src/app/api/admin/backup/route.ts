import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';
import { handleApiError } from '@/lib/api-errors';

// GET - Export backup
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const backup = await exportBackup();
      return NextResponse.json(backup);
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}