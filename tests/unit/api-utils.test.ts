import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  validateOriginOrReferer,
  parsePagination,
  parseSortParams,
  escapeLike,
  buildPaginationResponse,
} from "@/lib/api-utils";

describe("validateOriginOrReferer", () => {
  it("allows matching Origin", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { origin: "https://example.com", host: "example.com" },
    });
    process.env.AUTH_URL = "https://example.com";
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it("rejects mismatched Origin", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { origin: "https://evil.com", host: "example.com" },
    });
    process.env.AUTH_URL = "https://example.com";
    const res = validateOriginOrReferer(req);
    expect(res?.status).toBe(403);
  });

  it("rejects when neither Origin nor Referer present", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { host: "example.com" },
    });
    process.env.AUTH_URL = "https://example.com";
    const res = validateOriginOrReferer(req);
    expect(res?.status).toBe(403);
  });

  it("falls back to Referer when Origin absent", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { referer: "https://example.com/page", host: "example.com" },
    });
    process.env.AUTH_URL = "https://example.com";
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it("rejects Referer from different host", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { referer: "https://evil.com/page", host: "example.com" },
    });
    process.env.AUTH_URL = "https://example.com";
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });

  it("skips check for GET", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "GET",
      headers: { host: "example.com" },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it("skips check for HEAD", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "HEAD",
      headers: { host: "example.com" },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it("skips check for OPTIONS", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "OPTIONS",
      headers: { host: "example.com" },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it("checks POST mutations", () => {
    const req = new NextRequest("https://example.com/api/inventory", {
      method: "POST",
      headers: { host: "example.com" },
    });
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });
});

describe("parsePagination", () => {
  it("defaults to page 1, pageSize 20", () => {
    const r = parsePagination(new URLSearchParams(""));
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.offset).toBe(0);
    expect(r.limit).toBe(20);
  });
  it("respects page and pageSize", () => {
    const r = parsePagination(new URLSearchParams("page=3&pageSize=50"));
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(50);
    expect(r.offset).toBe(100);
  });
  it("clamps pageSize to max 100", () => {
    const r = parsePagination(new URLSearchParams("pageSize=500"));
    expect(r.pageSize).toBe(100);
  });
  it("clamps to min 1", () => {
    const r = parsePagination(new URLSearchParams("page=0&pageSize=0"));
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(1);
  });
});

describe("parseSortParams", () => {
  it("defaults to defaultField and desc", () => {
    const r = parseSortParams(new URLSearchParams(""), ["name", "createdAt"], "createdAt");
    expect(r.sortBy).toBe("createdAt");
    expect(r.sortOrder).toBe("desc");
  });
  it("rejects unknown sortBy", () => {
    const r = parseSortParams(new URLSearchParams("sortBy=password"), ["name"], "name");
    expect(r.sortBy).toBe("name");
  });
  it("accepts asc", () => {
    const r = parseSortParams(new URLSearchParams("sortOrder=asc"), ["name"], "name", "desc");
    expect(r.sortOrder).toBe("asc");
  });
});

describe("escapeLike", () => {
  it("escapes % and _ and \\", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
});

describe("buildPaginationResponse", () => {
  it("computes totalPages", () => {
    expect(buildPaginationResponse(100, 1, 20)).toEqual({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
    });
  });
  it("handles zero total", () => {
    expect(buildPaginationResponse(0, 1, 20).totalPages).toBe(1);
  });
});
