import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 * 
 * This replaces the CSRF token system from v1.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  
  // Only check mutations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }
  
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || `https://${host}`;
  
  // Require at least one header
  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 }
    );
  }
  
  // Validate the source
  const source = origin || referer;
  try {
    const sourceUrl = new URL(source!);
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
 * 
 * This is the v2 pattern that replaces manual auth + CSRF + session revocation checks.
 */
export function withAuth<T = any>(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
    session: Session
  ) => Promise<NextResponse<T>>,
  options?: { requireAdmin?: boolean }
): (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<NextResponse<T>> {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) }
  ): Promise<NextResponse<T>> => {
    try {
      const session = await auth();
      
      if (!session?.user) {
        throw ApiErrors.Unauthorized();
      }
      
      // Check if session was issued before last password change
      const passwordChangedAt = (session.user as any).passwordChangedAt || 0;
      const iat = (session.user as any).iat || 0;
      
      if (passwordChangedAt > 0 && iat < passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }
      
      // Check admin requirement
      if (options?.requireAdmin && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }
      
      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error) as NextResponse<T>;
    }
  };
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  
  return { page, pageSize, offset };
}

/**
 * Parse sort parameters from URL search params
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string
): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() as 'asc' | 'desc';
  
  // Validate sortBy is in allowed fields
  if (!allowedFields.includes(sortBy)) {
    return { sortBy: defaultField, sortOrder };
  }
  
  // Validate sortOrder
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    return { sortBy, sortOrder: 'desc' };
  }
  
  return { sortBy, sortOrder };
}

/**
 * Escape special characters in LIKE patterns
 */
export function escapeLike(input: string): string {
  return input.replace(/[%_]/g, '\\$&');
}

/**
 * Parse date range from search params
 */
export function parseDateRange(searchParams: URLSearchParams): {
  startDate: Date | null;
  endDate: Date | null;
} {
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (startDateStr) {
    const parsed = new Date(startDateStr);
    if (!isNaN(parsed.getTime())) {
      startDate = parsed;
    }
  }
  
  if (endDateStr) {
    const parsed = new Date(endDateStr);
    if (!isNaN(parsed.getTime())) {
      // Set to end of day
      parsed.setHours(23, 59, 59, 999);
      endDate = parsed;
    }
  }
  
  return { startDate, endDate };
}

/**
 * Build pagination response metadata
 */
export function buildPaginationResponse(
  page: number,
  pageSize: number,
  total: number
) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
