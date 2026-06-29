// Test environment setup — runs before each test file.
// Use a unique test DB path; overridden per-suite via DATABASE_PATH env var.

// Set via ` Reflect.set` to bypass the readonly typing on process.env.NODE_ENV.
Reflect.set(process.env, 'NODE_ENV', 'test');
process.env.AUTH_SECRET = 'test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.AUTH_URL = 'http://localhost:3000';
process.env.COOKIE_SECURE = 'false';
process.env.DATABASE_PATH = process.env.DATABASE_PATH || './test.db';