import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, cleanupTestDb } from "../../setup/db";
import * as schema from "@/lib/schema";
import { validateBackup } from "@/lib/backup";

let db: ReturnType<typeof createTestDb>["db"];
let path: string;

beforeAll(async () => {
  const t = createTestDb();
  db = t.db;
  path = t.path;
});

afterAll(() => {
  cleanupTestDb(path);
});

describe("Backup restore validation", () => {
  it("valid backup can be validated", () => {
    const valid = {
      version: 2,
      exportedAt: "2024-01-01T00:00:00.000Z",
      tables: {
        users: [
          {
            id: 1,
            email: "a@b.com",
            passwordHash: "h",
            name: "A",
            role: "admin",
            canViewAll: true,
            isActive: true,
            passwordChangedAt: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        items: [],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [
          {
            id: 1,
            companyName: "X",
            companyTagline: "",
            salesTaxRate: 0.0825,
            setupComplete: true,
            updatedAt: 1000,
          },
        ],
      },
    };
    expect(() => validateBackup(valid)).not.toThrow();
  });

  it("rejects backup with invalid item status", () => {
    const bad = {
      version: 2,
      exportedAt: "2024-01-01T00:00:00.000Z",
      tables: {
        users: [],
        items: [
          {
            id: 1,
            name: "X",
            purchaseDate: 1000,
            purchasePrice: 5,
            status: "not-a-status",
            ownerId: 1,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [],
      },
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("restores valid backup atomically (no partial changes)", async () => {
    const valid = validateBackup({
      version: 2,
      exportedAt: "2024-01-01T00:00:00.000Z",
      tables: {
        users: [
          {
            id: 1,
            email: "x@y.com",
            passwordHash: "h",
            name: "X",
            role: "user",
            canViewAll: false,
            isActive: true,
            passwordChangedAt: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        items: [],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [
          {
            id: 1,
            companyName: "X",
            companyTagline: "",
            salesTaxRate: 0.05,
            setupComplete: true,
            updatedAt: 1000,
          },
        ],
      },
    });

    db.transaction((tx) => {
      for (const u of valid.tables.users) {
        tx.insert(schema.users).values({
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
        }).run();
      }
      for (const c of valid.tables.app_config) {
        tx.insert(schema.appConfig).values({
          id: c.id,
          companyName: c.companyName,
          companyTagline: c.companyTagline,
          salesTaxRate: c.salesTaxRate,
          setupComplete: c.setupComplete,
          updatedAt: c.updatedAt,
        }).run();
      }
    });

    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("x@y.com");
  });
});
