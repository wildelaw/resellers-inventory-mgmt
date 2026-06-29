import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/http-utils';

function makeReq(opts: {
  method?: string;
  origin?: string | null;
  referer?: string | null;
  host?: string;
  url?: string;
}) {
  const method = opts.method ?? 'POST';
  const url = opts.url ?? 'https://example.com/api/inventory';
  const req = new NextRequest(url, { method });
  if (opts.origin !== undefined && opts.origin !== null) req.headers.set('origin', opts.origin);
  if (opts.referer !== undefined && opts.referer !== null) req.headers.set('referer', opts.referer);
  req.headers.set('host', opts.host ?? 'example.com');
  return req;
}

describe('validateOriginOrReferer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows matching Origin header', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: 'https://example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: 'https://evil.com' });
    const res = validateOriginOrReferer(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: null, referer: null });
    const res = validateOriginOrReferer(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('skips check for GET requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ method: 'GET', origin: null, referer: null });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for HEAD requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ method: 'HEAD', origin: null, referer: null });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('skips check for OPTIONS requests', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ method: 'OPTIONS', origin: null, referer: null });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('falls back to Referer when Origin is absent', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: null, referer: 'https://example.com/sales' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects Referer from different origin', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: null, referer: 'https://evil.com/x' });
    const res = validateOriginOrReferer(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('falls back to Host header when AUTH_URL unset', () => {
    delete process.env.AUTH_URL;
    const req = makeReq({ origin: 'https://example.com', host: 'example.com' });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects malformed Origin', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ origin: 'not-a-url' });
    const res = validateOriginOrReferer(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('checks PATCH', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ method: 'PATCH', origin: 'https://evil.com' });
    const res = validateOriginOrReferer(req);
    expect(res!.status).toBe(403);
  });

  it('checks DELETE', () => {
    process.env.AUTH_URL = 'https://example.com';
    const req = makeReq({ method: 'DELETE', origin: null, referer: null });
    const res = validateOriginOrReferer(req);
    expect(res!.status).toBe(403);
  });
});

describe('parsePagination', () => {
  it('uses defaults for missing params', () => {
    const p = parsePagination(new URLSearchParams());
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(20);
    expect(p.offset).toBe(0);
    expect(p.limit).toBe(20);
  });

  it('respects provided page and pageSize', () => {
    const p = parsePagination(new URLSearchParams('page=3&pageSize=50'));
    expect(p.page).toBe(3);
    expect(p.pageSize).toBe(50);
    expect(p.offset).toBe(100);
  });

  it('caps pageSize at 100', () => {
    const p = parsePagination(new URLSearchParams('pageSize=500'));
    expect(p.pageSize).toBe(100);
  });

  it('falls back to defaults for invalid values', () => {
    const p = parsePagination(new URLSearchParams('page=-1&pageSize=abc'));
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(20);
  });
});

describe('parseSortParams', () => {
  it('uses default field when not provided', () => {
    const s = parseSortParams(new URLSearchParams(), ['createdAt', 'name'], 'createdAt');
    expect(s.sortBy).toBe('createdAt');
    expect(s.sortOrder).toBe('desc');
  });

  it('respects allowed fields', () => {
    const s = parseSortParams(new URLSearchParams('sortBy=name&sortOrder=asc'), ['createdAt', 'name'], 'createdAt');
    expect(s.sortBy).toBe('name');
    expect(s.sortOrder).toBe('asc');
  });

  it('falls back to default for disallowed field', () => {
    const s = parseSortParams(new URLSearchParams('sortBy=evil'), ['createdAt'], 'createdAt');
    expect(s.sortBy).toBe('createdAt');
  });

  it('forces desc for invalid sortOrder', () => {
    const s = parseSortParams(new URLSearchParams('sortOrder=sideways'), ['createdAt'], 'createdAt');
    expect(s.sortOrder).toBe('desc');
  });
});

describe('escapeLike', () => {
  it('escapes %, _, and backslash', () => {
    expect(escapeLike('50%_off')).toBe('50\\%\\_off');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });
});