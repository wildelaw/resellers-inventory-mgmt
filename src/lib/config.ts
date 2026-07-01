export const config = {
  database: {
    path: process.env.NODE_ENV === 'production' 
      ? '/data/sqlite.db' 
      : (process.env.DATABASE_PATH || 'sqlite.db'),
  },
  uploads: {
    path: process.env.NODE_ENV === 'production'
      ? '/data/uploads'
      : (process.env.UPLOADS_PATH || 'uploads'),
  },
  backups: {
    path: process.env.NODE_ENV === 'production'
      ? '/data/backups'
      : (process.env.BACKUPS_PATH || 'backups'),
  },
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  },
} as const;

export function getDbPath(): string {
  return config.database.path;
}

export function getUploadsPath(): string {
  return config.uploads.path;
}

export function getBackupsPath(): string {
  return config.backups.path;
}
