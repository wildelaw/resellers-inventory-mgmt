import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 * Auth routes (/api/auth/*) and setup routes are exempt.
 * GET, HEAD, OPTIONS requests are exempt.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null; // Only check mutations
  }

  // Exempt auth routes (no session yet at login)
  const pathname = new URL(req.url).pathname;
  if (pathname.startsWith('/api/auth/')) {
    return null;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || (host ? `https://${host}` : '');

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  const source = origin || referer;
  if (!source) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  try {
    const sourceUrl = new URL(source);
    const authUrlObj = new URL(authUrl);
    if (sourceUrl.origin !== authUrlObj.origin) {
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
 * Wraps an API route handler with authentication, session validation, and error handling.
 * Eliminates repetitive boilerplate from every route.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      // Check if session was issued before last password change
      const passwordChangedAt = (session.user as Record<string, unknown>).passwordChangedAt as number;
      const iat = (session.user as Record<string, unknown>).iat as number;
      if (passwordChangedAt > 0 && (iat || 0) < passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
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

/** Parse pagination params from URL search params */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/** Parse sort params from URL search params */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string
) {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // Convert camelCase sortBy to snake_case for DB columns
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  return { field, direction: sortOrder };
}

/** Escape LIKE wildcards to prevent LIKE injection */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

/** Build pagination response */
export function paginateResults<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}