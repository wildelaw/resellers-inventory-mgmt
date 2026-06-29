import { NextResponse } from 'next/server';

/** Application error with HTTP status and a stable code. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = '', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Factory of common API errors. */
export const ApiErrors = {
  Unauthorized: (message = 'Unauthorized', details?: unknown) =>
    new ApiError(401, message, 'UNAUTHORIZED', details),
  Forbidden: (message = 'Forbidden', details?: unknown) =>
    new ApiError(403, message, 'FORBIDDEN', details),
  NotFound: (resource = 'Resource') =>
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),
  BadRequest: (message: string, details?: unknown) =>
    new ApiError(400, message, 'BAD_REQUEST', details),
  Conflict: (message: string, details?: unknown) =>
    new ApiError(409, message, 'CONFLICT', details),
  InvalidOrigin: (message = 'Invalid or missing Origin header') =>
    new ApiError(403, message, 'INVALID_ORIGIN'),
};

/** Translate any thrown error into a JSON NextResponse. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error.code) body.code = error.code;
    if (error.details !== undefined) body.details = error.details;
    return NextResponse.json(body, { status: error.status });
  }

  // Zod-style error
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const z = error as { issues: { message: string }[] };
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: z.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}