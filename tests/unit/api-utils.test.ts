import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOriginOrReferer } from '@/lib/api-utils';

describe('validateOriginOrReferer', () => {
  const originalAuthUrl = process.env.AUTH_URL;

  beforeEach(() => { process.env.AUTH_URL = 'https://example.com'; });
  afterEach(() => { process.env.AUTH_URL = originalAuthUrl; });

  function makeReq(method: string, headers: Record<string, string> = {}, url = '/api/inventory') {
    return new NextRequest(`https://example.com${url}`, { method, headers });
  }

  it('allows matching Origin header on POST', () => {
    const req = makeReq('POST', { origin: 'https://example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    const req = makeReq('POST', { origin: 'https://evil.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    const req = makeReq('POST', {});
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('skips check for GET requests', () => {
    const req = makeReq('GET', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    const req = makeReq('HEAD', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    const req = makeReq('OPTIONS', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('checks PUT requests', () => {
    const req = makeReq('PUT', { origin: 'https://evil.com' });
    const result = validateOriginOrReferer(req);
    expect(result!.status).toBe(403);
  });

  it('checks DELETE requests', () => {
    const req = makeReq('DELETE', { origin: 'https://evil.com' });
    const result = validateOriginOrReferer(req);
    expect(result!.status).toBe(403);
  });

  it('checks PATCH requests', () => {
    const req = makeReq('PATCH', { origin: 'https://evil.com' });
    const result = validateOriginOrReferer(req);
    expect(result!.status).toBe(403);
  });

  it('falls back to Referer when Origin is absent', () => {
    const req = makeReq('POST', { referer: 'https://example.com/api/sales' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Referer', () => {
    const req = makeReq('POST', { referer: 'https://evil.com/page' });
    const result = validateOriginOrReferer(req);
    expect(result!.status).toBe(403);
  });

  it('rejects when Origin is malformed', () => {
    const req = makeReq('POST', { origin: 'not-a-url' });
    const result = validateOriginOrReferer(req);
    expect(result!.status).toBe(403);
  });

  it('uses Host header when AUTH_URL is unset', () => {
    delete process.env.AUTH_URL;
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });
});
