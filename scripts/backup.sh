#!/bin/sh
# Gzip-compressed SQLite backup with 7-day retention.
set -e
BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
TS=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/sqlite_${TS}.db.gz"

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/sqlite_${TS}.db'"
gzip -f "$BACKUP_DIR/sqlite_${TS}.db"
echo "Backup created: $OUT"

# Retention: delete backups older than 7 days
find "$BACKUP_DIR" -name 'sqlite_*.db.gz' -mtime +7 -delete || true