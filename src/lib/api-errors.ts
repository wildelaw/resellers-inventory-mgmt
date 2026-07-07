import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) =>
    new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: (message?: string) => new ApiError(403, message || 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) =>
    new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string, details?: string[]) =>
    new ApiError(400, message, 'BAD_REQUEST', details),
  Conflict: (message: string) => new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: () =>
    new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
};

/** Serialize any thrown error (ApiError, Zod error, or generic) into a JSON response. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error.code) body.code = error.code;
    if (error.details && error.details.length > 0) body.details = error.details;
    return NextResponse.json(body, { status: error.status });
  }
  // Zod errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues: { message: string }[] }).issues;
    const messages = issues.map((i) => i.message);
    return NextResponse.json(
      { error: 'Validation failed', details: messages, code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }
  console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
