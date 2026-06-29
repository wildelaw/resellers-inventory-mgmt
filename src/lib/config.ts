/**
 * Centralized configuration — paths and auth settings.
 * Rate limiting is handled by Caddy, so there is no rateLimit section here.
 */
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  database: {
    path: isProd ? '/data/sqlite.db' : process.env.DATABASE_PATH || 'sqlite.db',
  },
  uploads: {
    path: isProd ? '/data/uploads' : process.env.UPLOADS_PATH || 'uploads',
  },
  backups: {
    path: isProd ? '/data/backups' : process.env.BACKUPS_PATH || 'backups',
  },
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days (seconds)
    bcryptCost: 10, // SEC-02: bcrypt cost factor 10
  },
} as const;

export type AppConfig = typeof config;