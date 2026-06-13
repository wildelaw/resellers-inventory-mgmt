#!/bin/sh

# Database backup script
# Run via cron: 0 2 * * * /data/backups/backup.sh

BACKUP_DIR="${BACKUPS_PATH:-/data/backups}"
DB_PATH="${DATABASE_PATH:-/data/sqlite.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sqlite_$TIMESTAMP.db.gz"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/temp_backup.db'"
gzip -c "$BACKUP_DIR/temp_backup.db" > "$BACKUP_FILE"
rm -f "$BACKUP_DIR/temp_backup.db"

# Clean old backups
find "$BACKUP_DIR" -name "sqlite_*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup created: $BACKUP_FILE"