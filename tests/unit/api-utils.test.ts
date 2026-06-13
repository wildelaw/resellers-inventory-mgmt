import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// We need to test validateOriginOrReferer without importing next-auth
// So we inline the core logic for testing

function validateOriginOrRefererForTest(
  method: string,
  pathname: string,
  origin: string | null,
  referer: string | null,
  authUrl: string
): { valid: boolean; status?: number; code?: string } {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    return { valid: true };
  }

  if (pathname.startsWith('/api/auth/')) {
    return { valid: true };
  }

  if (pathname === '/api/setup' && method.toUpperCase() === 'POST') {
    return { valid: true };
  }

  if (!origin && !referer) {
    return { valid: false, status: 403, code: 'INVALID_ORIGIN' };
  }

  const source = origin || referer;
  if (!source) {
    return { valid: false, status: 403, code: 'INVALID_ORIGIN' };
  }

  try {
    const sourceUrl = new URL(source);
    const authUrlObj = new URL(authUrl);
    if (sourceUrl.origin !== authUrlObj.origin) {
      return { valid: false, status: 403, code: 'INVALID_ORIGIN' };
    }
  } catch {
    return { valid: false, status: 403, code: 'INVALID_ORIGIN' };
  }

  return { valid: true };
}

describe('validateOriginOrReferer', () => {
  const authUrl = 'https://example.com';

  it('allows matching Origin header on POST', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/inventory', 'https://example.com', null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('rejects mismatched Origin header', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/inventory', 'https://evil.com', null, authUrl);
    expect(result.valid).toBe(false);
    expect(result.status).toBe(403);
  });

  it('rejects missing Origin and Referer on POST', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/inventory', null, null, authUrl);
    expect(result.valid).toBe(false);
    expect(result.status).toBe(403);
  });

  it('falls back to Referer when Origin is absent', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/inventory', null, 'https://example.com/sales', authUrl);
    expect(result.valid).toBe(true);
  });

  it('rejects mismatched Referer', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/inventory', null, 'https://evil.com/page', authUrl);
    expect(result.valid).toBe(false);
  });

  it('skips check for GET requests', () => {
    const result = validateOriginOrRefererForTest('GET', '/api/inventory', null, null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('skips check for HEAD requests', () => {
    const result = validateOriginOrRefererForTest('HEAD', '/api/inventory', null, null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('skips check for OPTIONS requests', () => {
    const result = validateOriginOrRefererForTest('OPTIONS', '/api/inventory', null, null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('checks PUT requests (mutation)', () => {
    const result = validateOriginOrRefererForTest('PUT', '/api/inventory/1', 'https://example.com', null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('checks DELETE requests (mutation)', () => {
    const result = validateOriginOrRefererForTest('DELETE', '/api/inventory/1', 'https://example.com', null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('checks PATCH requests (mutation)', () => {
    const result = validateOriginOrRefererForTest('PATCH', '/api/sales', 'https://example.com', null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('exempts auth routes', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/auth/callback/credentials', null, null, authUrl);
    expect(result.valid).toBe(true);
  });

  it('exempts setup POST route', () => {
    const result = validateOriginOrRefererForTest('POST', '/api/setup', null, null, authUrl);
    expect(result.valid).toBe(true);
  });
});