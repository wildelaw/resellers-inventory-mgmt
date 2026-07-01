import { NextRequest, NextResponse } from 'next/server';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { mileageToCsv } from '@/lib/csv';
import { handleApiError } from '@/lib/api-errors';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * GET /api/mileage/export
 * Export mileage entries as CSV (user sees only their own)
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { startDate, endDate } = parseDateRange(searchParams);

    // Build where conditions
    const conditions = [eq(mileage.ownerId, parseInt(session.user.id))];

    if (startDate) {
      conditions.push(gte(mileage.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(mileage.date, endDate));
    }

    const whereClause = and(...conditions);

    // Get all entries
    const entries = await db.query.mileage.findMany({
      where: whereClause,
      orderBy: desc(mileage.date),
    });

    // Convert to CSV
    const csv = mileageToCsv(entries);

    // Generate filename with date range
    const startStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endStr = endDate ? endDate.toISOString().split('T')[0] : 'all';
    const filename = `mileage_${startStr}_to_${endStr}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  })(req);
}
