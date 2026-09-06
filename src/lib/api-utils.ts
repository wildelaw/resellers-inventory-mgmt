import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export type AuthedHandler = (
  req: NextRequest,
  ctx: RouteContext,
  session: Session
) => Promise<NextResponse>;

/**
 * Validate the Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring the request came from the configured origin.
 *
 * Exempt: GET/HEAD/OPTIONS methods, /api/auth/* (no session yet at login),
 * and POST /api/setup (initial setup, before any session exists).
 *
 * Returns a 403 response on failure, or null when the request is valid
 * (or exempt from the check).
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null; // Only check mutations
  }

  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/auth/')) {
    return null; // Auth endpoints are exempt — no session exists yet
  }
  if (pathname === '/api/setup' && method === 'POST') {
    return null; // Initial setup — before any session exists
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  // Empty-string header values count as absent (some proxies strip the value)
  const source = (origin || referer) as string;
  // Prefer the Host header; fall back to the request URL's host (tests and
  // some proxies may not send an explicit Host header).
  const host = req.headers.get('host') ?? req.nextUrl.host;
  const authUrl = process.env.AUTH_URL;

  try {
    const sourceUrl = new URL(source);
    if (authUrl) {
      // Explicit configuration wins — compare full origins
      if (sourceUrl.origin !== new URL(authUrl).origin) {
        return NextResponse.json(
          { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
          { status: 403 }
        );
      }
    } else if (host) {
      // No AUTH_URL: compare the source host against the request Host header.
      // Scheme is deliberately ignored — Caddy terminates TLS and forwards to
      // the app over http, so a browser Origin of https://domain must match a
      // Host header of domain.
      if (sourceUrl.host !== host) {
        return NextResponse.json(
          { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid Origin header', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  return null; // Valid
}

/**
 * Wraps an API route handler with authentication, session validation, and
 * error handling. Eliminates repetitive boilerplate from every route.
 *
 * Usage: `export const GET = withAuth(async (req, ctx, session) => {...})`
 * Origin/Referer validation for mutations is called separately inside the
 * handler via `validateOriginOrReferer(req)`.
 */
export function withAuth(handler: AuthedHandler, options?: { requireAdmin?: boolean }) {
  return async (req: NextRequest, ctx?: RouteContext): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      // Check if the session was issued before the user's last password change
      if (session.user.passwordChangedAt > 0 &&
          (session.user.iat || 0) < session.user.passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }

      if (options?.requireAdmin && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      return await handler(req, ctx ?? { params: Promise.resolve({}) }, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Pagination / sorting / LIKE escaping
// ---------------------------------------------------------------------------

export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string
): SortParams {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order: 'asc' | 'desc' = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  return { field, order };
}

/** Escapes user input used inside a LIKE pattern to prevent LIKE injection. */
export function escapeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/** Parses a JSON body, converting malformed payloads into a 400 error. */
export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw ApiErrors.BadRequest('Request body must be valid JSON');
  }
}

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/** Parses optional startDate/endDate query parameters into a Date range. */
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const result: DateRange = {};
  const start = searchParams.get('startDate');
  const end = searchParams.get('endDate');
  if (start) {
    const d = new Date(start);
    if (!isNaN(d.getTime())) result.startDate = d;
  }
  if (end) {
    const d = new Date(end);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999); // endDate is inclusive
      result.endDate = d;
    }
  }
  return result;
}