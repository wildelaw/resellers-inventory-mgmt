// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.AUTH_URL = 'https://localhost:3000';

// Mock next-auth modules for unit tests
import { vi } from 'vitest';

const mockAuth = vi.fn(() => Promise.resolve(null));
const mockHandlers = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next-auth', () => ({
  default: () => ({
    handlers: mockHandlers,
    signIn: mockSignIn,
    signOut: mockSignOut,
    auth: mockAuth,
  }),
  auth: mockAuth,
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: any) => new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })),
    redirect: vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } })),
  },
  NextRequest: class NextRequest extends Request {
    constructor(input: any, init?: any) {
      super(input, init);
    }
  },
}));