/**
 * Vitest setup — ensures a test AUTH_SECRET, dev paths, and jsdom globals.
 */
import { vi } from 'vitest';

(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-for-vitest-32-chars-long!';
process.env.AUTH_URL = 'http://localhost:3000';
process.env.COOKIE_SECURE = 'false';
process.env.DATABASE_PATH = process.env.DATABASE_PATH || './sqlite.test.db';
process.env.UPLOADS_PATH = './uploads-test';
process.env.BACKUPS_PATH = './backups-test';

// next/server NextRequest/NextResponse need a minimal DOM in jsdom env.
if (typeof globalThis.Request === 'undefined') {
  // jsdom provides fetch/Request in newer versions; nothing to polyfill here.
}

// Silence noisy console.error from expected 401/403 paths during tests.
// (comment out the next line to see full logs while debugging)
// const origError = console.error;
// console.error = (...args) => { /* noop */ };