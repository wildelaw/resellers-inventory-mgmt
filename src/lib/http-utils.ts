import { NextRequest, NextResponse } from 'next/server';

// Pure helpers with no `auth()` dependency — safe to import in unit tests.

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATION_METHODS.has(method)) {
    return null;
  }

  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const authUrl = process.env.AUTH_URL || (host ? `https://${host}` : '');

  if (!origin && !referer) {
    return NextResponse.json(
      { error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  const source = origin || referer;
  if (!source) {
    return NextResponse.json(
      { error: 'Invalid or missing Origin header', code: 'INVALID_ORIGIN' },
      { status: 403 },
    );
  }

  try {
    const sourceUrl = new URL(source);
    let expectedOrigin: string;
    if (authUrl) {
      expectedOrigin = new URL(authUrl).origin;
    } else if (host) {
      expectedOrigin = new URL(`https://${host}`).origin;
    } else {
      return NextResponse.json(
        { error: 'Invalid or missing Origin header', code: 'INVALID_ORIGIN' },
        { status: 403 },
      );
    }
    if (sourceUrl.origin !== expectedOrigin) {
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

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawPage = Number(searchParams.get('page') ?? 1);
  const rawPageSize = Number(searchParams.get('pageSize') ?? 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  let pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : 20;
  if (pageSize > 100) pageSize = 100;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
}

export function paginationResponse(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string,
): SortParams {
  const rawBy = (searchParams.get('sortBy') ?? defaultField).trim();
  const rawOrder = (searchParams.get('sortOrder') ?? 'desc').trim().toLowerCase();
  const sortBy = allowedFields.includes(rawBy) ? rawBy : defaultField;
  const sortOrder: 'asc' | 'desc' = rawOrder === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

export function escapeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export function likeContains(input: string): string {
  return `%${escapeLike(input)}%`;
}