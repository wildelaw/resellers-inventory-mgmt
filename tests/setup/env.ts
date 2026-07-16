declare const process: { env: Record<string, string | undefined> };

process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "test-secret-for-vitest-only-do-not-use-in-prod";
process.env.AUTH_URL = "http://localhost:3000";
process.env.DATABASE_PATH = ":memory:";
process.env.UPLOADS_PATH = "./tests/.tmp/uploads";
process.env.BACKUPS_PATH = "./tests/.tmp/backups";

export {};
