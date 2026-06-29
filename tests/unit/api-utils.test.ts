import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOriginOrReferer, parsePagination, parseSortParams, escapeLike, likeContains, parseIdList } from '@/lib/api-utils';

function req(url: string, method: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${url}`, { method, headers });
}

describe('validateOriginOrReferer', () => {
  it('allows matching Origin header', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST', { origin: 'http://localhost:3000' });
    expect(validateOriginOrReferer(r)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST', { origin: 'https://evil.com' });
    const res = validateOriginOrReferer(r);
    expect(res?.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST');
    const res = validateOriginOrReferer(r);
    expect(res?.status).toBe(403);
  });

  it('falls back to Referer when Origin absent and matches', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST', { referer: 'http://localhost:3000/inventory' });
    expect(validateOriginOrReferer(r)).toBeNull();
  });

  it('rejects Referer that does not match host', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST', { referer: 'https://evil.com/page' });
    expect(validateOriginOrReferer(r)?.status).toBe(403);
  });

  it('skips the check for GET requests', () => {
    const r = req('/api/inventory', 'GET');
    expect(validateOriginOrReferer(r)).toBeNull();
  });

  it('skips the check for DELETE on /api/auth/* (auth exempt)', () => {
    const r = req('/api/auth/signout', 'POST', {});
    expect(validateOriginOrReferer(r)).toBeNull();
  });

  it('skips the check for POST /api/setup (pre-session exempt)', () => {
    const r = req('/api/setup', 'POST', {});
    expect(validateOriginOrReferer(r)).toBeNull();
  });

  it('rejects malformed Origin', () => {
    process.env.AUTH_URL = 'http://localhost:3000';
    const r = req('/api/inventory', 'POST', { origin: 'not-a-url' });
    expect(validateOriginOrReferer(r)?.status).toBe(403);
  });
});

describe('parsePagination', () => {
  it('uses defaults', () => {
    const p = parsePagination(new URLSearchParams());
    expect(p).toEqual({ page: 1, pageSize: 20, limit: 20, offset: 0 });
  });
  it('clamps pageSize to 100', () => {
    const p = parsePagination(new URLSearchParams('pageSize=500'));
    expect(p.pageSize).toBe(100);
  });
  it('computes offset from page', () => {
    const p = parsePagination(new URLSearchParams('page=3&pageSize=10'));
    expect(p.offset).toBe(20);
  });
  it('falls back on invalid input', () => {
    const p = parsePagination(new URLSearchParams('page=-1&pageSize=abc'));
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(20);
  });
});

describe('parseSortParams', () => {
  it('falls back to default field when not allowed', () => {
    const s = parseSortParams(new URLSearchParams('sortBy=evil'), ['createdAt', 'name'], 'createdAt');
    expect(s.sortBy).toBe('createdAt');
  });
  it('respects asc/desc', () => {
    expect(parseSortParams(new URLSearchParams('sortOrder=asc'), ['a'], 'a').sortOrder).toBe('asc');
    expect(parseSortParams(new URLSearchParams('sortOrder=desc'), ['a'], 'a').sortOrder).toBe('desc');
    expect(parseSortParams(new URLSearchParams('sortOrder=garbage'), ['a'], 'a').sortOrder).toBe('desc');
  });
});

describe('escapeLike / likeContains / parseIdList', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%off')).toBe('50\\%off');
    expect(escapeLike('a_b')).toBe('a\\_b');
  });
  it('wraps term in %...%', () => {
    expect(likeContains('hat')).toBe('%hat%');
  });
  it('parses and dedupes id lists', () => {
    expect(parseIdList('1,2,2,3,bad,0')).toEqual([1, 2, 3]);
    expect(parseIdList(null)).toEqual([]);
  });
});