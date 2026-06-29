#!/bin/sh
# SQLite backup script — gzip-compressed copy with 7-day retention.
# Schedule via cron: 0 2 * * * /data/backups/backup.sh
set -e

DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/sqlite_${TIMESTAMP}.db.gz"

mkdir -p "$BACKUP_DIR"

# Use sqlite3 .backup (online, consistent) if available, else copy.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/sqlite_${TIMESTAMP}.db'"
  gzip -f "$BACKUP_DIR/sqlite_${TIMESTAMP}.db"
else
  gzip -c "$DB_PATH" > "$OUT"
fi

# Retention: keep the last 7 days.
find "$BACKUP_DIR" -name 'sqlite_*.db.gz' -type f -mtime +7 -delete

echo "[backup] Wrote $OUT"