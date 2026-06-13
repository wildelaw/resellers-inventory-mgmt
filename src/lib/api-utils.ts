import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { UserRole } from './constants';

// Extend the session type
interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  canViewAll: boolean;
  passwordChangedAt: number;
  iat: number;
}

export interface Session {
  user: SessionUser;
}

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  const pathname = new URL(req.url).pathname;
  if (pathname.startsWith('/api/auth/')) {
    return null;
  }

  if (pathname === '/api/setup' && method === 'POST') {
    return null;
  }

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }

  const source = origin || referer;
  try {
    const sourceUrl = new URL(source!);
    const authUrl = process.env.AUTH_URL || `https://${req.headers.get('host')}`;
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

  return null;
}

/**
 * Wraps an API route handler with authentication, session validation, and error handling.
 * This is called directly inside route handlers and returns a NextResponse.
 * 
 * Usage in route files:
 *   export async function GET(req: NextRequest) {
 *     return withAuth(req, async (session) => {
 *       return NextResponse.json({ data: 'hello' });
 *     });
 *   }
 *   
 *   export async function POST(req: NextRequest) {
 *     return withAuth(req, async (session) => {
 *       const originError = validateOriginOrReferer(req);
 *       if (originError) return originError;
 *       return NextResponse.json({ created: true }, { status: 201 });
 *     }, { requireAdmin: true });
 *   }
 */
export async function withAuth(
  req: NextRequest,
  handler: (session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) throw ApiErrors.Unauthorized();

    const user = session.user as unknown as SessionUser;

    if (user.passwordChangedAt > 0 && (user.iat || 0) < user.passwordChangedAt) {
      throw ApiErrors.Unauthorized('Session invalidated');
    }

    if (options?.requireAdmin && user.role !== 'admin') {
      throw ApiErrors.Forbidden();
    }

    return await handler({ user } as Session);
  } catch (error) {
    return handleApiError(error);
  }
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string
) {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const validatedSortBy = allowedFields.includes(sortBy) ? sortBy : defaultField;
  return { sortBy: validatedSortBy, sortOrder };
}

export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export function buildPagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}