import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { ApiErrors, handleApiError } from "./api-errors";

export type AuthedHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  session: Session
) => Promise<NextResponse>;

export interface WithAuthOptions {
  requireAdmin?: boolean;
}

/**
 * Wraps a handler that needs an authenticated session.
 * Returns a Next.js route handler that can be assigned to GET/POST/etc.
 *
 * Usage:
 *   export const GET = withAuth(async (req, ctx, session) => { ... });
 *   export const POST = withAuth(async (req, ctx, session) => { ... }, { requireAdmin: true });
 */
export function withAuth(
  handler: AuthedHandler,
  options: WithAuthOptions = {}
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) }
  ): Promise<NextResponse> => {
    try {
      const { auth } = await import("./auth");
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      const passwordChangedAt = session.user.passwordChangedAt ?? 0;
      const iat = session.user.iat ?? 0;
      if (passwordChangedAt > 0 && iat < passwordChangedAt) {
        throw ApiErrors.Unauthorized("Session invalidated");
      }

      if (options.requireAdmin && session.user.role !== "admin") {
        throw ApiErrors.Forbidden();
      }

      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

const MUTATION_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

export function validateOriginOrReferer(
  req: NextRequest
): NextResponse | null {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return null;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!origin && !referer) {
    return NextResponse.json(
      { error: "Missing Origin and Referer headers", code: "INVALID_ORIGIN" },
      { status: 403 }
    );
  }

  const source = origin || referer!;
  const authUrl = process.env.AUTH_URL || (host ? `http://${host}` : "");

  try {
    const sourceUrl = new URL(source);
    const authUrlObj = new URL(authUrl);
    if (sourceUrl.origin !== authUrlObj.origin) {
      return NextResponse.json(
        { error: "Invalid Origin header", code: "INVALID_ORIGIN" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid Origin header", code: "INVALID_ORIGIN" },
      { status: 403 }
    );
  }

  return null;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaultPageSize = 20,
  maxPageSize = 100
): PaginationResult {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10))
  );
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

export interface SortResult {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string,
  defaultOrder: "asc" | "desc" = "desc"
): SortResult {
  const sortBy = searchParams.get("sortBy") || defaultField;
  const sortOrderRaw = (searchParams.get("sortOrder") || defaultOrder).toLowerCase();
  return {
    sortBy: allowedFields.includes(sortBy) ? sortBy : defaultField,
    sortOrder: sortOrderRaw === "asc" ? "asc" : "desc",
  };
}

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function buildPaginationResponse(
  total: number,
  page: number,
  pageSize: number
) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
