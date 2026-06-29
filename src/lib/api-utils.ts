/**
 * API route utilities: the `withAuth` wrapper, Origin/Referer CSRF validation,
 * and pagination / sorting / LIKE-escaping helpers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'] as const;

/** Paths that mutate but run before a session exists — exempt from Origin check. */
const ORIGIN_EXEMPT_PREFIXES = ['/api/auth/', '/api/setup'];

/**
 * Validate the Origin (or Referer fallback) header for state-changing requests.
 * Returns a 403 NextResponse on failure, or null when the request is allowed
 * (or not a mutation).
 *
 * Exempt: GET/HEAD/OPTIONS, and /api/auth/* + /api/setup (pre-session mutations).
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATION_METHODS.includes(method as (typeof MUTATION_METHODS)[number])) {
    return null; // only check mutations
  }

  const pathname = req.nextUrl?.pathname ?? new URL(req.url).pathname;
  if (ORIGIN_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || (host ? `https://${host}` : undefined);

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  const source = origin || referer;
  if (!authUrl) {
    // No way to validate an expected host without AUTH_URL or Host — reject to be safe.
    return NextResponse.json(
      { error: 'Unable to verify request origin', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  try {
    const sourceUrl = new URL(source as string);
    const authUrlObj = new URL(authUrl);
    if (sourceUrl.origin !== authUrlObj.origin) {
      return NextResponse.json(
        { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  return null;
}

export interface RouteCtx {
  params: Promise<Record<string, string>>;
}

/**
 * Wrap an API route handler with authentication, session-invalidation, optional
 * admin enforcement, and uniform error handling. Eliminates boilerplate from
 * every authenticated route.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: RouteCtx, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean },
) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      const pca = (session.user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
      const iat = (session.user as { iat?: number }).iat ?? 0;
      if (pca > 0 && iat < pca) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }
      if ((session.user as { isActive?: boolean }).isActive === false) {
        throw ApiErrors.Unauthorized('Account inactive');
      }

      if (options?.requireAdmin && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface Pagination {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

export function parsePagination(searchParams: URLSearchParams | Record<string, string>): Pagination {
  const sp = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  const pageRaw = parseInt(sp.get('page') || '1', 10);
  const pageSizeRaw = parseInt(sp.get('pageSize') || '20', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 20;
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0 };
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function parseSortParams(
  searchParams: URLSearchParams | Record<string, string>,
  allowedFields: string[],
  defaultField: string,
): SortParams {
  const sp = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  const rawSort = (sp.get('sortBy') || defaultField).trim();
  const sortBy = allowedFields.includes(rawSort) ? rawSort : defaultField;
  const order = (sp.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder: order };
}

// ---------------------------------------------------------------------------
// LIKE escaping (prevent wildcard / injection through search inputs)
// ---------------------------------------------------------------------------
export function escapeLike(input: string): string {
  return String(input).replace(/[%_\\]/g, (m) => `\\${m}`);
}

/** Build a `LIKE '%term%'` clause value with escaped special chars. */
export function likeContains(input: string): string {
  return `%${escapeLike(input)}%`;
}

/** Parse comma-separated ids from query string into a deduped number[]. */
export function parseIdList(value: string | null): number[] {
  if (!value) return [];
  const ids = value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(ids));
}