import { vi, beforeAll, afterAll } from 'vitest';

// Mock next/server to avoid import errors in test environment
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    method: string;
    headers: Map<string, string>;
    url: string;
    constructor(url: string, init?: { method?: string; headers?: Record<string, string> }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  },
  NextResponse: class MockNextResponse {
    status: number;
    body: unknown;
    constructor(body?: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  },
}));

// Mock next-auth to avoid loading next/server chain
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn().mockResolvedValue(null),
  }),
}));

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET = 'test-secret-for-vitest-only';
  process.env.AUTH_URL = 'https://example.com';
  process.env.DATABASE_PATH = 'sqlite-test.db';
  process.env.UPLOADS_PATH = 'uploads-test';
  process.env.BACKUPS_PATH = 'backups-test';
});

afterAll(() => {
  // Cleanup handled per-suite
});