import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db, getRawSqlite } from "@/lib/db";
import { validateBackup } from "@/lib/backup";
import { appConfig, users, items, sales, photos, mileage } from "@/lib/schema";
import { handleApiError } from "@/lib/api-errors";
import { ZodError } from "zod";

export const POST = withAuth(
  async (req) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    let backup;
    try {
      backup = validateBackup(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid backup: " + err.issues.map((i) => i.message).join("; ") },
          { status: 400 }
        );
      }
      throw err;
    }

    const sqlite = getRawSqlite();
    sqlite.exec("PRAGMA foreign_keys = OFF");
    try {
      db.transaction((tx) => {
        tx.delete(photos).run();
        tx.delete(sales).run();
        tx.delete(mileage).run();
        tx.delete(items).run();
        tx.delete(users).run();
        tx.delete(appConfig).run();
      });

      if (backup.tables.app_config.length > 0) {
        for (const row of backup.tables.app_config) {
          db.insert(appConfig).values({
            id: row.id,
            companyName: row.companyName,
            companyTagline: row.companyTagline,
            salesTaxRate: row.salesTaxRate,
            setupComplete: row.setupComplete,
            updatedAt: row.updatedAt,
          }).run();
        }
      } else {
        db.insert(appConfig).values({ id: 1 }).run();
      }

      for (const u of backup.tables.users) {
        db.insert(users).values({
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
          canViewAll: u.canViewAll,
          isActive: u.isActive,
          passwordChangedAt: u.passwordChangedAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          createdBy: u.createdBy ?? null,
          lastLogin: u.lastLogin ?? null,
        }).run();
      }

      for (const it of backup.tables.items) {
        db.insert(items).values({
          id: it.id,
          name: it.name,
          description: it.description ?? null,
          purchaseDate: it.purchaseDate,
          purchasePrice: it.purchasePrice,
          purchaseLocation: it.purchaseLocation ?? null,
          category: it.category ?? null,
          status: it.status as never,
          notes: it.notes ?? null,
          removalDate: it.removalDate ?? null,
          metadata: it.metadata ?? null,
          ownerId: it.ownerId,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
        }).run();
      }

      for (const m of backup.tables.mileage) {
        db.insert(mileage).values({
          id: m.id,
          date: m.date,
          miles: m.miles,
          fromLocation: m.fromLocation ?? null,
          toLocation: m.toLocation ?? null,
          address: m.address ?? null,
          vehicle: m.vehicle ?? null,
          purpose: m.purpose ?? null,
          ownerId: m.ownerId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }).run();
      }

      for (const s of backup.tables.sales) {
        db.insert(sales).values({
          id: s.id,
          itemId: s.itemId ?? null,
          soldDate: s.soldDate,
          soldPrice: s.soldPrice,
          shippingCost: s.shippingCost ?? null,
          shippingCollected: s.shippingCollected ?? null,
          platform: s.platform as never,
          salesTax: s.salesTax ?? null,
          platformFees: s.platformFees ?? null,
          refundAmount: s.refundAmount ?? null,
          refundReason: s.refundReason ?? null,
          refundType: s.refundType as never,
          soldBy: s.soldBy,
          createdAt: s.createdAt,
        }).run();
      }

      for (const p of backup.tables.photos) {
        db.insert(photos).values({
          id: p.id,
          itemId: p.itemId,
          filename: p.filename,
          path: p.path,
          isPrimary: p.isPrimary,
          createdAt: p.createdAt,
        }).run();
      }
    } finally {
      sqlite.exec("PRAGMA foreign_keys = ON");
    }

    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
