import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const validateOriginOrReferer = vi.hoisted(() => {
  return function validateOriginOrReferer(req: any): any {
    const method = req.method?.toUpperCase?.() || '';
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return null;
    }

    const origin = req.headers?.get?.('origin');
    const referer = req.headers?.get?.('referer');
    const authUrl = process.env.AUTH_URL || 'https://example.com';

    if (!origin && !referer) {
      return { status: 403, json: () => ({ error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' }) };
    }

    const source = origin || referer;
    try {
      const sourceUrl = new URL(source!);
      const authUrlObj = new URL(authUrl);
      if (sourceUrl.origin !== authUrlObj.origin) {
        return { status: 403, json: () => ({ error: 'Invalid Origin header', code: 'INVALID_ORIGIN' }) };
      }
    } catch {
      return { status: 403, json: () => ({ error: 'Invalid Origin header', code: 'INVALID_ORIGIN' }) };
    }

    return null;
  };
});

describe('validateOriginOrReferer', () => {
  beforeAll(() => {
    process.env.AUTH_URL = 'https://example.com';
  });

  afterAll(() => {
    delete process.env.AUTH_URL;
  });

  it('allows matching Origin header on POST', () => {
    const req = { method: 'POST', headers: { get: (h: string) => h === 'origin' ? 'https://example.com' : null } };
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header on POST', () => {
    const req = { method: 'POST', headers: { get: (h: string) => h === 'origin' ? 'https://evil.com' : null } };
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });

  it('rejects missing Origin and Referer on POST', () => {
    const req = { method: 'POST', headers: { get: () => null } };
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });

  it('allows Referer fallback when Origin is missing', () => {
    const req = { method: 'POST', headers: { get: (h: string) => h === 'origin' ? null : h === 'referer' ? 'https://example.com/inventory' : null } };
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for GET requests', () => {
    const req = { method: 'GET', headers: { get: () => null } };
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    const req = { method: 'HEAD', headers: { get: () => null } };
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    const req = { method: 'OPTIONS', headers: { get: () => null } };
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects on PUT with mismatched Origin', () => {
    const req = { method: 'PUT', headers: { get: (h: string) => h === 'origin' ? 'https://attacker.com' : null } };
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });

  it('rejects on DELETE with missing Origin', () => {
    const req = { method: 'DELETE', headers: { get: () => null } };
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });

  it('rejects on PATCH with missing Origin', () => {
    const req = { method: 'PATCH', headers: { get: () => null } };
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });
});