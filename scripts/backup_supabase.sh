#!/usr/bin/env bash
# Daily Supabase backup for HealthyU.
# Runs at 03:00 UTC, dumps all public tables, sends file to Telegram.
# Retention: keep 30 days of backups in /home/ubuntu/backups/healthyu/.

set -e
cd /home/ubuntu/projects/HealthyU

# 1. Run backup
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting HealthyU backup"
python3 scripts/backup_supabase.py 2>&1 | tee /tmp/healthyu-backup.log

# 2. Find the latest backup file
LATEST=$(ls -t /home/ubuntu/backups/healthyu/healthyu-*.json.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "ERROR: No backup file produced"
  exit 1
fi
SIZE=$(stat -c%s "$LATEST")
ROWS=$(python3 -c "import gzip,json; d=json.load(gzip.open('$LATEST')); print(d['metadata']['total_rows'])")
TABLES=$(python3 -c "import gzip,json; d=json.load(gzip.open('$LATEST')); print(d['metadata']['tables_count'])")
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete: $LATEST ($SIZE bytes, $TABLES tables, $ROWS rows)"
