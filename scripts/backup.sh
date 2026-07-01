#!/bin/sh
# Backup script — gzip-compressed SQLite backup with 7-day retention
BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sqlite_${TIMESTAMP}.db.gz"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
  echo "Creating backup: $BACKUP_FILE"
  gzip -c "$DB_PATH" > "$BACKUP_FILE"
  echo "Backup complete"

  # Delete backups older than 7 days
  find "$BACKUP_DIR" -name "sqlite_*.db.gz" -mtime +7 -delete
  echo "Old backups cleaned up"
else
  echo "Database file not found: $DB_PATH"
  exit 1
fi