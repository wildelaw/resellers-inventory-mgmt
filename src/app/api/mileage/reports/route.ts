import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { withAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";

export const GET = withAuth(async (req, _ctx, session) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const ownerId = Number(session.user.id);

  const filters = [eq(mileage.ownerId, ownerId)];
  const startDate = sp.get("startDate");
  if (startDate) {
    const t = Math.floor(new Date(startDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(gte(mileage.date, t));
  }
  const endDate = sp.get("endDate");
  if (endDate) {
    const t = Math.floor(new Date(endDate).getTime() / 1000);
    if (!isNaN(t)) filters.push(lte(mileage.date, t));
  }

  const where = and(...filters);

  const totalRow = await db
    .select({
      total: sql<number>`COALESCE(SUM(${mileage.miles}), 0)`,
      trips: sql<number>`count(*)`,
    })
    .from(mileage)
    .where(where);
  const totals = totalRow[0];

  const byMonth = await db
    .select({
      month: sql<string>`strftime('%Y-%m', datetime(${mileage.date}, 'unixepoch'))`,
      miles: sql<number>`SUM(${mileage.miles})`,
      trips: sql<number>`count(*)`,
    })
    .from(mileage)
    .where(where)
    .groupBy(sql`strftime('%Y-%m', datetime(${mileage.date}, 'unixepoch'))`)
    .orderBy(sql`strftime('%Y-%m', datetime(${mileage.date}, 'unixepoch'))`);

  const byVehicle = await db
    .select({
      vehicle: mileage.vehicle,
      miles: sql<number>`SUM(${mileage.miles})`,
      trips: sql<number>`count(*)`,
    })
    .from(mileage)
    .where(where)
    .groupBy(mileage.vehicle);

  const totalMiles = Number(totals?.total ?? 0);
  const trips = Number(totals?.trips ?? 0);

  return NextResponse.json({
    totalMiles,
    trips,
    averageMiles: trips > 0 ? totalMiles / trips : 0,
    byMonth,
    byVehicle: byVehicle.map((v) => ({
      vehicle: v.vehicle ?? "Unknown",
      miles: Number(v.miles),
      trips: Number(v.trips),
    })),
  });
});
