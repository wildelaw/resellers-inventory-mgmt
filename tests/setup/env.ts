// Test environment setup
process.env.NODE_ENV = 'test' as string;
process.env.DATABASE_PATH = ':memory:';
process.env.AUTH_SECRET = 'test-secret-key-for-unit-tests';
process.env.AUTH_URL = 'https://localhost:3000';