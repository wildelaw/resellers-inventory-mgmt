#!/bin/sh
# Gzip-compressed SQLite backup with 7-day retention.
set -e

BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/sqlite_$TIMESTAMP.db'"
gzip -f "$BACKUP_DIR/sqlite_$TIMESTAMP.db"

# Retention: keep the 7 most recent backups
ls -t "$BACKUP_DIR"/sqlite_*.db.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "Backup complete: $BACKUP_DIR/sqlite_$TIMESTAMP.db.gz"