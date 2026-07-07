import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Validate the Origin or Referer header for state-changing requests.
 * This is the CSRF protection mechanism (replaces the v1 double-submit token).
 *
 * - GET/HEAD/OPTIONS are always allowed.
 * - The Origin header (falling back to Referer) must match the configured AUTH_URL
 *   or the request's Host header.
 * - Missing both headers on a mutation → 403 INVALID_ORIGIN.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATION_METHODS.includes(method)) {
    return null;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || (host ? `https://${host}` : '');

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  const source = origin || referer;
  if (!source || !authUrl) {
    return NextResponse.json(
      { error: 'Invalid or missing Origin header', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  try {
    const sourceUrl = new URL(source);
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

interface WithAuthOptions {
  requireAdmin?: boolean;
}

/**
 * Wraps an API route handler with authentication, session-invalidation, optional
 * admin enforcement, and centralized error handling. Eliminates repetitive boilerplate.
 */
export function withAuth(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
    session: Session,
  ) => Promise<NextResponse> | NextResponse,
  options?: WithAuthOptions,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      // Session invalidation: JWT issued before last password change.
      const pca = (session.user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
      const iat = (session.user as { iat?: number }).iat ?? 0;
      if (pca > 0 && iat < pca) {
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

/** Parse pagination params. pageSize default 20, max 100. */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const requestedSize = parseInt(searchParams.get('pageSize') || '20', 10) || 20;
  const pageSize = Math.min(100, Math.max(1, requestedSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Parse sort params against an allow-list of fields. */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string,
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const sortByRaw = (searchParams.get('sortBy') || defaultField).trim();
  const sortBy = allowedFields.includes(sortByRaw) ? sortByRaw : defaultField;
  const sortOrderRaw = (searchParams.get('sortOrder') || 'desc').toLowerCase();
  const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

/** Escape LIKE wildcard characters to prevent injection in search patterns. */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, (m) => `\\${m}`);
}

/** Build a pagination response envelope. */
export function paginationEnvelope(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
