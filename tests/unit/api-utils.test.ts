import { describe, it, expect } from 'vitest';
import { validateOriginOrReferer } from '../../src/lib/api-utils';
import { NextRequest } from 'next/server';

function createRequest(method: string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/test', {
    method,
    headers,
  });
}

describe('validateOriginOrReferer', () => {
  it('allows matching Origin header', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', { origin: 'http://localhost:3000' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', { origin: 'https://evil.com' });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', {});
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('allows Referer fallback when Origin missing', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', { referer: 'http://localhost:3000/some-page' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Referer', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', { referer: 'https://evil.com/page' });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('skips check for GET requests', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('GET', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    const req = createRequest('HEAD', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    const req = createRequest('OPTIONS', {});
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('checks PUT requests', () => {
    const req = createRequest('PUT', {});
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('checks DELETE requests', () => {
    const req = createRequest('DELETE', {});
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('checks PATCH requests', () => {
    const req = createRequest('PATCH', {});
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('rejects invalid Origin URL', () => {
    const req = createRequest('POST', { origin: 'not-a-url' });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('allows matching Origin with different path', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const req = createRequest('POST', { origin: 'http://localhost:3000' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });
});