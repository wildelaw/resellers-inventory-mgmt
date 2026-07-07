import { NextResponse } from 'next/server';

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || '';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) => new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: (message?: string) => new ApiError(403, message || 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) => new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string) => new ApiError(400, message, 'BAD_REQUEST'),
  Conflict: (message: string) => new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: () => new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
  Internal: (message?: string) => new ApiError(500, message || 'Internal server error'),
};

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Zod errors
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      { error: 'Validation failed', details: (error as any).issues?.map((e: any) => e.message) || [error.message] },
      { status: 400 }
    );
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}