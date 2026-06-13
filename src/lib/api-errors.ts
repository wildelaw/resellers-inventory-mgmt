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
  Forbidden: () =>
    new ApiError(403, 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) =>
    new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string) =>
    new ApiError(400, message, 'BAD_REQUEST'),
  Conflict: (message: string) =>
    new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: () =>
    new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
};

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled API error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}