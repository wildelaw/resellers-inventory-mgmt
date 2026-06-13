import { describe, it, expect, vi } from 'vitest';
import { validateOriginOrReferer } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

describe('validateOriginOrReferer', () => {
  const originalEnv = process.env.AUTH_URL;

  beforeEach(() => {
    process.env.AUTH_URL = 'https://inventory.example.com';
  });

  afterEach(() => {
    process.env.AUTH_URL = originalEnv;
  });

  it('allows matching Origin header on mutations', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://inventory.example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'POST',
    });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('falls back to Referer when Origin is missing', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'POST',
      headers: { referer: 'https://inventory.example.com/inventory' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for GET requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'GET',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'HEAD',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory', {
      method: 'OPTIONS',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('checks PUT requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory/1', {
      method: 'PUT',
    });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('checks DELETE requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/inventory/1', {
      method: 'DELETE',
    });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('checks PATCH requests', () => {
    const req = new NextRequest('https://inventory.example.com/api/sales', {
      method: 'PATCH',
    });
    const result = validateOriginOrReferer(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('exempts auth routes', () => {
    const req = new NextRequest('https://inventory.example.com/api/auth/callback/credentials', {
      method: 'POST',
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('uses host header when AUTH_URL is not set', () => {
    delete process.env.AUTH_URL;
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });
});