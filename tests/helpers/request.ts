import { NextRequest } from 'next/server';

export function makeRequest(
  method: string,
  url: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      host: 'example.com',
      origin: 'https://example.com',
      ...(opts.headers || {}),
    },
  };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  return new NextRequest(`https://example.com${url}`, init);
}
