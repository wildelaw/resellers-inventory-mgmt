import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';
import type { Session } from 'next-auth';
import {
  validateOriginOrReferer as validateOriginOrRefererImpl,
  parsePagination as parsePaginationImpl,
  parseSortParams as parseSortParamsImpl,
  escapeLike as escapeLikeImpl,
  likeContains as likeContainsImpl,
  paginationResponse as paginationResponseImpl,
} from './http-utils';

// Re-export pure helpers (no auth dependency) for use by routes and tests.
export const validateOriginOrReferer = validateOriginOrRefererImpl;
export const parsePagination = parsePaginationImpl;
export const parseSortParams = parseSortParamsImpl;
export const escapeLike = escapeLikeImpl;
export const likeContains = likeContainsImpl;
export const paginationResponse = paginationResponseImpl;
export type PaginationParams = import('./http-utils').PaginationParams;
export type SortParams = import('./http-utils').SortParams;

type RouteCtx = { params: Promise<Record<string, string>> };

export function withAuth(
  handler: (req: NextRequest, ctx: RouteCtx, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean },
) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();

      const pca = session.user.passwordChangedAt ?? 0;
      const iat = session.user.iat ?? 0;
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