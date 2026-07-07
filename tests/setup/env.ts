process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-for-vitest-32chars!!';
process.env.AUTH_URL = 'https://example.com';
process.env.DATABASE_PATH = process.env.TEST_DB_PATH || './test.db';
process.env.UPLOADS_PATH = './test-uploads';
process.env.BACKUPS_PATH = './test-backups';
