import { NextRequest, NextResponse } from 'next/server';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { handleApiError } from '@/lib/api-errors';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * GET /api/mileage/reports
 * Get mileage reports and aggregates (user sees only their own)
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

    // Get all entries for aggregation
    const entries = await db.query.mileage.findMany({
      where: whereClause,
    });

    // Calculate totals
    const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0);
    const totalTrips = entries.length;
    const averageMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

    // Group by month
    const byMonth: Record<string, { miles: number; trips: number }> = {};
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { miles: 0, trips: 0 };
      }
      
      byMonth[monthKey].miles += entry.miles;
      byMonth[monthKey].trips += 1;
    });

    // Group by vehicle
    const byVehicle: Record<string, { miles: number; trips: number }> = {};
    entries.forEach(entry => {
      const vehicle = entry.vehicle || 'Unknown';
      
      if (!byVehicle[vehicle]) {
        byVehicle[vehicle] = { miles: 0, trips: 0 };
      }
      
      byVehicle[vehicle].miles += entry.miles;
      byVehicle[vehicle].trips += 1;
    });

    return NextResponse.json({
      summary: {
        totalMiles,
        totalTrips,
        averageMiles,
      },
      byMonth: Object.entries(byMonth).map(([month, data]) => ({
        month,
        ...data,
      })).sort((a, b) => b.month.localeCompare(a.month)),
      byVehicle: Object.entries(byVehicle).map(([vehicle, data]) => ({
        vehicle,
        ...data,
      })).sort((a, b) => b.miles - a.miles),
    });
  })(req);
}
