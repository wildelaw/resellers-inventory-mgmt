import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
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

  return null;
}

interface AuthContext {
  params: Promise<Record<string, string>>;
}

export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext, session: Session) => Promise<Response | NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest, ctx: AuthContext): Promise<Response | NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      const passwordChangedAt = (session.user as any).passwordChangedAt ?? 0;
      const iat = (session.user as any).iat ?? 0;
      if (passwordChangedAt > 0 && iat < passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }

      if (options?.requireAdmin && (session.user as any).role !== 'admin') {
        throw ApiErrors.Forbidden();
      }

      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
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
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc' as const;
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  return { field, direction: sortOrder };
}

export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}