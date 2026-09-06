import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOriginOrReferer } from '@/lib/api-utils';

// api-utils imports './auth' (NextAuth) at module level — mock it so the
// next-auth/next/server ESM resolution issue never loads under vitest.
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));

function makeReq(
  url: string,
  method: string,
  headers: Record<string, string>
): NextRequest {
  return new NextRequest(url, { method, headers });
}

const BASE = 'https://example.com/api/inventory';

describe('validateOriginOrReferer', () => {
  it('allows matching Origin header', () => {
    const req = makeReq(BASE, 'POST', { origin: 'https://example.com', host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    const req = makeReq(BASE, 'POST', { origin: 'https://evil.com', host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    const req = makeReq(BASE, 'POST', { host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('falls back to Referer when Origin is missing', () => {
    const req = makeReq(BASE, 'POST', {
      referer: 'https://example.com/inventory',
      host: 'example.com',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Referer', () => {
    const req = makeReq(BASE, 'POST', {
      referer: 'https://evil.com/inventory',
      host: 'example.com',
    });
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });

  it('skips check for GET/HEAD/OPTIONS requests', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const req = makeReq(BASE, method, { host: 'example.com' });
      expect(validateOriginOrReferer(req)).toBeNull();
    }
  });

  it('exempts /api/auth/* endpoints', () => {
    const req = makeReq('https://example.com/api/auth/signin', 'POST', {
      origin: 'https://evil.com',
      host: 'example.com',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('exempts POST /api/setup (bootstrap)', () => {
    const req = makeReq('https://example.com/api/setup', 'POST', {
      origin: 'https://evil.com',
      host: 'example.com',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('does NOT exempt PUT /api/setup', () => {
    const req = makeReq('https://example.com/api/setup', 'PUT', {
      origin: 'https://evil.com',
      host: 'example.com',
    });
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });

  it('validates all mutation methods', () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const bad = makeReq(BASE, method, { origin: 'https://evil.com', host: 'example.com' });
      expect(validateOriginOrReferer(bad)?.status).toBe(403);
      const good = makeReq(BASE, method, { origin: 'https://example.com', host: 'example.com' });
      expect(validateOriginOrReferer(good)).toBeNull();
    }
  });

  it('rejects malformed origin strings', () => {
    const req = makeReq(BASE, 'POST', { origin: 'not a url', host: 'example.com' });
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });
});