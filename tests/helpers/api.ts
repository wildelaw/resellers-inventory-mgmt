/**
 * Helpers for integration tests: build NextRequest objects, invoke route
 * handlers, and parse JSON responses.
 */
import { NextRequest } from 'next/server';

export interface RouteCtx {
  params: Promise<Record<string, string>>;
}

export function makeCtx(params: Record<string, string> = {}): RouteCtx {
  return { params: Promise.resolve(params) };
}

export function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; origin?: string } = {},
): NextRequest {
  const { method = 'GET', body, headers = {}, origin } = options;
  const hdrs: Record<string, string> = { ...headers };
  if (origin) hdrs['origin'] = origin;
  if (body !== undefined && !hdrs['Content-Type']) hdrs['Content-Type'] = 'application/json';
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: hdrs,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}

/** Invoke a route handler and return { status, body }. */
export async function invoke(
  handler: (req: NextRequest, ctx: RouteCtx) => Promise<Response>,
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; origin?: string; params?: Record<string, string> } = {},
): Promise<{ status: number; body: unknown }> {
  const req = makeRequest(url, options);
  const ctx = makeCtx(options.params);
  const res = await handler(req, ctx);
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body };
}

export function jsonBody(res: { body: unknown }): any {
  return res.body;
}