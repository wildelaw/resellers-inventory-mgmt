import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) => 
    new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  
  Forbidden: (message?: string) => 
    new ApiError(403, message || 'Forbidden', 'FORBIDDEN'),
  
  NotFound: (resource?: string) => 
    new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  
  BadRequest: (message: string) => 
    new ApiError(400, message, 'BAD_REQUEST'),
  
  Conflict: (message: string) => 
    new ApiError(409, message, 'CONFLICT'),
  
  InvalidOrigin: () => 
    new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
  
  ValidationError: (message: string, details?: string[]) => {
    const error = new ApiError(400, message, 'VALIDATION_ERROR');
    (error as any).details = details;
    return error;
  },
  
  InternalError: (message?: string) => 
    new ApiError(500, message || 'Internal server error', 'INTERNAL_ERROR'),
};

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    const response: any = {
      error: error.message,
      code: error.code,
    };

    // Include details if present (for validation errors)
    if ((error as any).details) {
      response.details = (error as any).details;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any;
    return NextResponse.json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: zodError.issues?.map((issue: any) => issue.message) || [],
    }, { status: 400 });
  }

  // Generic error handling
  const isDev = process.env.NODE_ENV === 'development';
  return NextResponse.json({
    error: isDev && error instanceof Error ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
  }, { status: 500 });
}
