import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { items, sales, mileage } from "@/lib/schema";
import { importSchema } from "@/lib/validations";
import { parseCsv, buildColumnMappings } from "@/lib/csv-parser";
import { ApiErrors } from "@/lib/api-errors";

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const data = importSchema.parse(body);

  const parsed = parseCsv(data.csvData);
  if (parsed.errors.length && parsed.rows.length === 0) {
    throw ApiErrors.BadRequest(`CSV parse errors: ${parsed.errors.join(", ")}`);
  }
  const mappings = buildColumnMappings(
    parsed.headers,
    data.columnMappings,
    data.type
  );

  const ownerId = Number(session.user.id);
  const errors: string[] = [];
  let success = 0;

  if (data.type === "inventory") {
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const name = mappings.name ? row[mappings.name] : "";
      if (!name) {
        errors.push(`Row ${i + 1}: missing name`);
        continue;
      }
      const purchasePriceRaw = mappings.purchasePrice
        ? row[mappings.purchasePrice]
        : "0";
      const purchasePrice = parseFloat(purchasePriceRaw || "0") || 0;
      const purchaseDateRaw = mappings.purchaseDate ? row[mappings.purchaseDate] : "";
      const purchaseDate = purchaseDateRaw
        ? Math.floor(new Date(purchaseDateRaw).getTime() / 1000) ||
          Math.floor(Date.now() / 1000)
        : Math.floor(Date.now() / 1000);
      const now = Math.floor(Date.now() / 1000);
      try {
        await db.insert(items).values({
          name,
          description: mappings.description ? row[mappings.description] || null : null,
          purchaseDate,
          purchasePrice,
          purchaseLocation: mappings.purchaseLocation
            ? row[mappings.purchaseLocation] || null
            : null,
          category: mappings.category ? row[mappings.category] || null : null,
          status: "available",
          notes: mappings.notes ? row[mappings.notes] || null : null,
          ownerId,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }
  } else if (data.type === "sales") {
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const soldPriceRaw = mappings.soldPrice ? row[mappings.soldPrice] : "0";
      const soldPrice = parseFloat(soldPriceRaw || "0") || 0;
      const platform = (mappings.platform ? row[mappings.platform] : "other").toLowerCase();
      if (!soldPrice) {
        errors.push(`Row ${i + 1}: missing sold price`);
        continue;
      }
      const soldDateRaw = mappings.soldDate ? row[mappings.soldDate] : "";
      const soldDate = soldDateRaw
        ? Math.floor(new Date(soldDateRaw).getTime() / 1000) ||
          Math.floor(Date.now() / 1000)
        : Math.floor(Date.now() / 1000);
      const now = Math.floor(Date.now() / 1000);
      let itemId: number | null = null;
      if (mappings.itemId && row[mappings.itemId]) {
        const id = parseInt(row[mappings.itemId], 10);
        if (Number.isFinite(id)) itemId = id;
      } else if (mappings.itemName && row[mappings.itemName]) {
        const found = await db.query.items.findFirst({
          where: eq(items.name, row[mappings.itemName]),
        });
        if (found) itemId = found.id;
      }
      try {
        await db.insert(sales).values({
          itemId,
          soldDate,
          soldPrice,
          shippingCost: mappings.shippingCost
            ? parseFloat(row[mappings.shippingCost] || "0") || null
            : null,
          shippingCollected: mappings.shippingCollected
            ? parseFloat(row[mappings.shippingCollected] || "0") || 0
            : 0,
          platform: (["local", "facebook", "instagram", "ebay", "poshmark", "mercari", "consignment", "other"].includes(platform)
            ? platform
            : "other") as never,
          salesTax: mappings.salesTax
            ? parseFloat(row[mappings.salesTax] || "0") || null
            : null,
          platformFees: mappings.platformFees
            ? parseFloat(row[mappings.platformFees] || "0") || 0
            : 0,
          refundAmount: mappings.refundAmount
            ? parseFloat(row[mappings.refundAmount] || "0") || 0
            : 0,
          refundReason: mappings.refundReason ? row[mappings.refundReason] || null : null,
          refundType: "none",
          soldBy: ownerId,
          createdAt: now,
        });
        if (itemId) {
          await db
            .update(items)
            .set({ status: "sold", removalDate: soldDate, updatedAt: now })
            .where(eq(items.id, itemId));
        }
        success++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }
  } else if (data.type === "mileage") {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < parsed.rows.length; i += 100) {
      const chunk = parsed.rows.slice(i, i + 100);
      const values = chunk
        .map((row) => {
          const dateRaw = mappings.date ? row[mappings.date] : "";
          if (!dateRaw) return null;
          const date = Math.floor(new Date(dateRaw).getTime() / 1000);
          if (!Number.isFinite(date)) return null;
          const milesRaw = mappings.miles ? row[mappings.miles] : "0";
          const miles = parseFloat(milesRaw || "0") || 0;
          if (!miles) return null;
          return {
            date,
            miles,
            fromLocation: mappings.fromLocation ? row[mappings.fromLocation] || null : null,
            toLocation: mappings.toLocation ? row[mappings.toLocation] || null : null,
            address: mappings.address ? row[mappings.address] || null : null,
            vehicle: mappings.vehicle ? row[mappings.vehicle] || null : null,
            purpose: mappings.purpose ? row[mappings.purpose] || null : null,
            ownerId,
            createdAt: now,
            updatedAt: now,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      if (values.length) {
        try {
          await db.insert(mileage).values(values);
          success += values.length;
        } catch (err) {
          errors.push(`Chunk at ${i}: ${(err as Error).message}`);
        }
      }
      const skipped = chunk.length - values.length;
      if (skipped > 0) {
        errors.push(`${skipped} rows in chunk ${i} skipped: missing date or miles`);
      }
    }
  }

  return NextResponse.json({ success, errors });
});
