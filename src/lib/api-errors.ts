import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const ApiErrors = {
  Unauthorized: (message?: string) =>
    new ApiError(401, message || "Unauthorized", "UNAUTHORIZED"),
  Forbidden: (message?: string) =>
    new ApiError(403, message || "Forbidden", "FORBIDDEN"),
  NotFound: (resource?: string) =>
    new ApiError(
      404,
      resource ? `${resource} not found` : "Not found",
      "NOT_FOUND"
    ),
  BadRequest: (message: string) =>
    new ApiError(400, message, "BAD_REQUEST"),
  Conflict: (message: string) => new ApiError(409, message, "CONFLICT"),
  InvalidOrigin: () =>
    new ApiError(
      403,
      "Invalid or missing Origin header",
      "INVALID_ORIGIN"
    ),
  Internal: (message?: string) =>
    new ApiError(500, message || "Internal server error", "INTERNAL"),
};

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }
  console.error("API error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
