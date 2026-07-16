import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { withAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";
import { mileageToCsv } from "@/lib/csv";

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
  const records = await db.select().from(mileage).where(where).orderBy(mileage.date);

  const csv = mileageToCsv(records);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="mileage-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
