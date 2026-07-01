import { describe, it, expect } from 'vitest';
import { validateOriginOrReferer } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

function makeReq(method: string, headers: Record<string, string> = {}, url = 'https://example.com/api/test') {
  return new NextRequest(url, { method, headers });
}

describe('validateOriginOrReferer', () => {
  it('allows matching Origin header', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { origin: 'https://example.com', host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { origin: 'https://evil.com', host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('falls back to Referer when Origin is absent', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { referer: 'https://example.com/page', host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Referer', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { referer: 'https://evil.com/page', host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('skips check for GET requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('GET', { host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('HEAD', { host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('OPTIONS', { host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('checks POST, PUT, DELETE, PATCH', () => {
    process.env.AUTH_URL = 'https://example.com';
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const req = makeReq(method, { host: 'example.com' });
      const result = validateOriginOrReferer(req);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    }
  });

  it('rejects malformed Origin header', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq('POST', { origin: 'not-a-url', host: 'example.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});