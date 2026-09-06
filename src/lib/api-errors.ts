import { NextResponse } from 'next/server';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: string[];

  constructor(status: number, message: string, code?: string, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) => new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: () => new ApiError(403, 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) => new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string) => new ApiError(400, message, 'BAD_REQUEST'),
  Conflict: (message: string) => new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: () => new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
};

/** Converts any thrown error into a properly shaped JSON error response. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error.code) body.code = error.code;
    if (error.details) body.details = error.details;
    return NextResponse.json(body, { status: error.status });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}