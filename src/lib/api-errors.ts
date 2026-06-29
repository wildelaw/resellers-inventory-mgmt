import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): NextResponse {
    const body: { error: string; code?: string; details?: unknown } = {
      error: this.message,
    };
    if (this.code) body.code = this.code;
    if (this.details !== undefined) body.details = this.details;
    return NextResponse.json(body, { status: this.statusCode });
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) =>
    new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: (message?: string) =>
    new ApiError(403, message || 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) =>
    new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string, details?: unknown) =>
    new ApiError(400, message, 'BAD_REQUEST', details),
  Conflict: (message: string) =>
    new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: (message?: string) =>
    new ApiError(403, message || 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
};

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return error.toResponse();
  }
  if (error instanceof Error) {
    // Zod errors are wrapped by callers; generic errors get a 500 without leakage
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  );
}