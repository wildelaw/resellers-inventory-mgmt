import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOriginOrReferer } from '@/lib/api-utils';

describe('origin validation integration', () => {
  beforeEach(() => { process.env.AUTH_URL = 'https://example.com'; });
  afterEach(() => {});

  it('rejects POST without Origin header', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST', headers: { host: 'example.com' },
    });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
    expect(result?.headers.get('content-type')).toContain('application/json');
  });

  it('allows POST with matching Origin', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST', headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects cross-origin DELETE', () => {
    const req = new NextRequest('https://example.com/api/inventory/1', {
      method: 'DELETE', headers: { origin: 'https://attacker.com', host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)?.status).toBe(403);
  });

  it('allows GET without Origin', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'GET', headers: { host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });
});
