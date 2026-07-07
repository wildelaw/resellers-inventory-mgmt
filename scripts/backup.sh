#!/bin/bash
# Daily backup script - compresses SQLite database with 7-day retention
BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sqlite_${DATE}.db.gz"

mkdir -p "${BACKUP_DIR}"

if [ -f "${DB_PATH}" ]; then
  sqlite3 "${DB_PATH}" ".backup '${DB_PATH}.bak'"
  gzip -c "${DB_PATH}.bak" > "${BACKUP_FILE}"
  rm -f "${DB_PATH}.bak"
  echo "Backup created: ${BACKUP_FILE}"

  # Retention: delete backups older than 7 days
  find "${BACKUP_DIR}" -name "sqlite_*.db.gz" -mtime +7 -delete
  echo "Old backups cleaned up."
else
  echo "Database not found at ${DB_PATH}, skipping backup."
fi