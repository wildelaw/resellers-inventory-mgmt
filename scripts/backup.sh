#!/bin/bash
# Backup script for SQLite database
# Run daily via cron: 0 2 * * * /data/backups/backup.sh

set -e

BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sqlite_${TIMESTAMP}.db.gz"

# Create backup using sqlite3 .backup command for consistency
sqlite3 "$DB_PATH" ".backup '${DB_PATH}.bak'"
gzip -c "$DB_PATH.bak" > "$BACKUP_FILE"
rm -f "$DB_PATH.bak"

echo "Backup created: $BACKUP_FILE"

# Clean up old backups
find "$BACKUP_DIR" -name "sqlite_*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned up (retention: ${RETENTION_DAYS} days)"