import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { withAuth, parseDateFilters } from '@/lib/api-utils';
import { handleApiError } from '@/lib/api-errors';
import { mileageToCsv } from '@/lib/csv';

// GET - CSV export
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { startDate, endDate } = parseDateFilters(searchParams);

      const conditions = [eq(mileage.ownerId, Number(session.user.id))];
      if (startDate) conditions.push(gte(mileage.date, startDate));
      if (endDate) conditions.push(lte(mileage.date, endDate));

      const entries = await db.query.mileage.findMany({
        where: and(...conditions),
        orderBy: (mileage, { desc }) => [desc(mileage.date)],
      });

      const csv = mileageToCsv(entries as any);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="mileage_export.csv"',
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}