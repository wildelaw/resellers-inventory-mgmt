import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 * Returns null if valid (or non-mutation method), otherwise a 403 NextResponse.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATION_METHODS.includes(method)) {
    return null; // Only check mutations
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || `https://${host}`;

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  const source = origin || referer;
  if (!source) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
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

  return null; // Valid
}

interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Wraps an API route handler with authentication, session validation, and error handling.
 * Eliminates repetitive boilerplate from every route.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: RouteContext, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean },
) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      // Check if session was issued before last password change
      const passwordChangedAt = (session.user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
      const iat = (session.user as { iat?: number }).iat ?? 0;
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

export function parsePagination(searchParams: URLSearchParams) {
  let page = parseInt(searchParams.get('page') || '1', 10);
  let pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(pageSize) || pageSize < 1) pageSize = 20;
  if (pageSize > 100) pageSize = 100;
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string,
) {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  return { field, order: sortOrder as 'asc' | 'desc' };
}

export function escapeLike(input: string): string {
  // Escape LIKE special characters: %, _, and \
  return input.replace(/[%_\\]/g, '\\$&');
}