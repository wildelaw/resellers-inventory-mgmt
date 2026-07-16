#!/bin/sh
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/data/backups
mkdir -p "$BACKUP_DIR"
sqlite3 /data/sqlite.db ".backup '$BACKUP_DIR/sqlite_$TIMESTAMP.db'"
gzip -f "$BACKUP_DIR/sqlite_$TIMESTAMP.db"
find "$BACKUP_DIR" -name 'sqlite_*.db.gz' -mtime +7 -delete
echo "Backup created: $BACKUP_DIR/sqlite_$TIMESTAMP.db.gz"
