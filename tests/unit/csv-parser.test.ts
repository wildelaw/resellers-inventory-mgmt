import { describe, it, expect } from "vitest";
import { parseCsv, buildColumnMappings, findFuzzyItemMatch } from "@/lib/csv-parser";

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const r = parseCsv("name,price\nA,5\nB,10");
    expect(r.headers).toEqual(["name", "price"]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].name).toBe("A");
  });

  it("trims whitespace", () => {
    const r = parseCsv(" name , price \n A , 5 ");
    expect(r.headers).toEqual(["name", "price"]);
    expect(r.rows[0].name).toBe("A");
  });

  it("returns errors for too-large CSV", () => {
    const big = "x," + "y".repeat(1024 * 1024);
    const r = parseCsv(big);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe("buildColumnMappings", () => {
  it("maps inventory headers by alias", () => {
    const m = buildColumnMappings(
      ["Item Name", "Purchase Date", "Cost", "Store", "Category"],
      undefined,
      "inventory"
    );
    expect(m.name).toBe("Item Name");
    expect(m.purchaseDate).toBe("Purchase Date");
    expect(m.purchasePrice).toBe("Cost");
    expect(m.purchaseLocation).toBe("Store");
    expect(m.category).toBe("Category");
  });

  it("prefers explicit mappings over fuzzy", () => {
    const m = buildColumnMappings(
      ["Item Name", "Cost"],
      { name: "Cost" },
      "inventory"
    );
    expect(m.name).toBe("Cost");
  });

  it("maps sales headers", () => {
    const m = buildColumnMappings(
      ["Sold Date", "Sale Price", "Platform"],
      undefined,
      "sales"
    );
    expect(m.soldDate).toBe("Sold Date");
    expect(m.soldPrice).toBe("Sale Price");
    expect(m.platform).toBe("Platform");
  });

  it("maps mileage headers", () => {
    const m = buildColumnMappings(
      ["Date", "Miles", "From", "To"],
      undefined,
      "mileage"
    );
    expect(m.date).toBe("Date");
    expect(m.miles).toBe("Miles");
    expect(m.fromLocation).toBe("From");
    expect(m.toLocation).toBe("To");
  });
});

describe("findFuzzyItemMatch", () => {
  const items = [
    { id: 1, name: "Vintage Jacket", purchaseDate: 1000, purchasePrice: 20 },
    { id: 2, name: "Retro Shirt", purchaseDate: 2000, purchasePrice: 15 },
  ];

  it("exact match", () => {
    expect(
      findFuzzyItemMatch(items, { name: "Vintage Jacket" })
    ).toBe(1);
  });

  it("partial match", () => {
    expect(findFuzzyItemMatch(items, { name: "Jacket" })).toBe(1);
  });

  it("no match returns null", () => {
    expect(findFuzzyItemMatch(items, { name: "Shoes" })).toBe(null);
  });

  it("requires date and price proximity", () => {
    expect(
      findFuzzyItemMatch(items, {
        name: "Jacket",
        purchaseDate: 999999,
        purchasePrice: 999,
      })
    ).toBe(null);
  });
});
