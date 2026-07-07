import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql, sum, count } from 'drizzle-orm';
import { withAuth, parseDateFilters } from '@/lib/api-utils';
import { handleApiError } from '@/lib/api-errors';

// GET - Mileage reports
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { startDate, endDate } = parseDateFilters(searchParams);

      const conditions = [eq(mileage.ownerId, Number(session.user.id))];
      if (startDate) conditions.push(gte(mileage.date, startDate));
      if (endDate) conditions.push(lte(mileage.date, endDate));

      const where = and(...conditions);

      // Total stats
      const totals = await db.select({
        totalMiles: sum(mileage.miles),
        totalTrips: count(),
      }).from(mileage).where(where);

      const totalMiles = Number(totals[0]?.totalMiles ?? 0);
      const totalTrips = Number(totals[0]?.totalTrips ?? 0);
      const avgMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

      // By month breakdown
      const monthlyData = await db.select({
        month: sql<string>`strftime('%Y-%m', ${mileage.date}, 'unixepoch')`,
        miles: sum(mileage.miles),
        trips: count(),
      }).from(mileage).where(where).groupBy(sql`strftime('%Y-%m', ${mileage.date}, 'unixepoch')`)
        .orderBy(sql`strftime('%Y-%m', ${mileage.date}, 'unixepoch')`);

      // By vehicle breakdown
      const vehicleData = await db.select({
        vehicle: mileage.vehicle,
        miles: sum(mileage.miles),
        trips: count(),
      }).from(mileage).where(where).groupBy(mileage.vehicle);

      return NextResponse.json({
        totalMiles,
        totalTrips,
        avgMilesPerTrip: avgMiles,
        byMonth: monthlyData.map((m: any) => ({
          month: m.month,
          miles: Number(m.miles ?? 0),
          trips: Number(m.trips ?? 0),
        })),
        byVehicle: vehicleData.map((v: any) => ({
          vehicle: v.vehicle || 'Unknown',
          miles: Number(v.miles ?? 0),
          trips: Number(v.trips ?? 0),
        })),
      });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}