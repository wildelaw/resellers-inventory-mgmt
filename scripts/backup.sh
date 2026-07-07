#!/bin/sh
# Gzip-compressed SQLite backup with 7-day retention.
BACKUPS_PATH="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUPS_PATH/sqlite_${TIMESTAMP}.db.gz"

mkdir -p "$BACKUPS_PATH"
sqlite3 "$DB_PATH" ".backup '$BACKUPS_PATH/sqlite_${TIMESTAMP}.db'"
gzip "$BACKUPS_PATH/sqlite_${TIMESTAMP}.db"
echo "Backup created: $BACKUP_FILE"

# Remove backups older than 7 days.
find "$BACKUPS_PATH" -name "sqlite_*.db.gz" -mtime +7 -delete
echo "Old backups cleaned up."
