// Test environment setup
process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-for-vitest';
process.env.AUTH_URL = 'http://localhost:3000';
process.env.DATABASE_PATH = 'test-db.sqlite';
process.env.UPLOADS_PATH = 'test-uploads';
process.env.BACKUPS_PATH = 'test-backups';