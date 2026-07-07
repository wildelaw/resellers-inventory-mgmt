import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors, ApiError } from './api-errors';
import type { Session } from 'next-auth';

export type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 * Browsers automatically send Origin headers on fetch() requests.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  // Only check state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || (host ? `https://${host}` : `http://${host}`);

  // If neither Origin nor Referer is present, reject
  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  const source = origin || referer!;

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
  handler: (req: NextRequest, ctx: RouteContext, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      // Check if session was issued before last password change
      const passwordChangedAt = (session.user as any).passwordChangedAt ?? 0;
      const iat = (session.user as any).iat ?? 0;
      if (passwordChangedAt > 0 && iat < passwordChangedAt) {
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

/**
 * Parse pagination parameters from search params.
 * Default page: 1, default pageSize: 20, max pageSize: 100
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  let pageSize = parseInt(searchParams.get('pageSize') || '20', 10) || 20;
  pageSize = Math.min(100, Math.max(1, pageSize));

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Parse sort parameters from search params.
 * Only allows sorting by fields in the allowedFields list.
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string
) {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // Validate sortBy is in allowed list
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;

  return { sortBy: field, sortOrder } as const;
}

/**
 * Escape special characters in LIKE queries to prevent SQL injection.
 */
export function escapeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/'/g, "''");
}

/**
 * Parse date range filters from search params.
 * Returns Unix timestamps (seconds) or undefined.
 */
export function parseDateFilters(searchParams: URLSearchParams) {
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  let startDate: number | undefined;
  let endDate: number | undefined;

  if (startDateStr) {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) startDate = Math.floor(d.getTime() / 1000);
  }

  if (endDateStr) {
    const d = new Date(endDateStr);
    if (!isNaN(d.getTime())) {
      // Set to end of day
      d.setHours(23, 59, 59, 999);
      endDate = Math.floor(d.getTime() / 1000);
    }
  }

  return { startDate, endDate };
}

/**
 * Create a paginated response object.
 */
export function paginatedResponse<T>(items: T[], total: number, page: number, pageSize: number) {
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