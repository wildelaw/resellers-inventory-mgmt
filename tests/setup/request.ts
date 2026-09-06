import { NextRequest } from 'next/server';

/**
 * Build a NextRequest for invoking route handlers directly in tests.
 * Origin header is set to match the request URL's origin so mutation
 * requests pass validateOriginOrReferer.
 */
export function jsonRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const origin = new URL(url).origin;
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      origin,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function paramsCtx(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}