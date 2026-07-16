import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";
import { updateMileageSchema } from "@/lib/validations";
import { canEditOthersData, canViewAllData } from "@/lib/auth-utils";
import { ApiErrors } from "@/lib/api-errors";

export const GET = withAuth(async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) throw ApiErrors.BadRequest("Invalid id");

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
  if (!entry) throw ApiErrors.NotFound("Mileage entry");
  if (entry.ownerId !== Number(session.user.id) && !canViewAllData(session)) {
    throw ApiErrors.NotFound("Mileage entry");
  }
  return NextResponse.json(entry);
});

export const PUT = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) throw ApiErrors.BadRequest("Invalid id");

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
  if (!entry) throw ApiErrors.NotFound("Mileage entry");
  if (entry.ownerId !== Number(session.user.id) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  const body = await req.json();
  const data = updateMileageSchema.parse(body);
  const now = Math.floor(Date.now() / 1000);

  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.date !== undefined) updates.date = data.date;
  if (data.miles !== undefined) updates.miles = data.miles;
  if (data.fromLocation !== undefined) updates.fromLocation = data.fromLocation;
  if (data.toLocation !== undefined) updates.toLocation = data.toLocation;
  if (data.address !== undefined) updates.address = data.address;
  if (data.vehicle !== undefined) updates.vehicle = data.vehicle;
  if (data.purpose !== undefined) updates.purpose = data.purpose;

  const updated = await db
    .update(mileage)
    .set(updates as never)
    .where(eq(mileage.id, mid))
    .returning();

  return NextResponse.json(updated[0]);
});

export const DELETE = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) throw ApiErrors.BadRequest("Invalid id");

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
  if (!entry) throw ApiErrors.NotFound("Mileage entry");
  if (entry.ownerId !== Number(session.user.id) && !canEditOthersData(session)) {
    throw ApiErrors.Forbidden();
  }

  await db.delete(mileage).where(eq(mileage.id, mid));
  return NextResponse.json({ success: true });
});
