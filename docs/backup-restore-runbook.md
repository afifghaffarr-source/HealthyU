# Backup & Restore Runbook — HealthyU

## Overview

Daily automated backup of the Supabase database. Backups are saved locally
on the VPS at `/home/ubuntu/backups/healthyu/` and sent to the operator's
Telegram chat for off-site redundancy.

## Schedule

- **Cron**: `0 3 * * *` (daily at 03:00 UTC)
- **Retention**: 30 days (auto-pruned)
- **Compression**: gzip (~10x ratio on empty tables)
- **Format**: JSON — `{"metadata": {...}, "data": {table_name: [rows]}, "failed_tables": [...]}`

## Files

| File                         | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `scripts/backup_supabase.py` | Main backup script (pure Python 3, no extra deps)   |
| `scripts/backup_supabase.sh` | Wrapper that runs the Python script + captures logs |

## Manual operations

### Run backup now

```bash
cd /home/ubuntu/projects/HealthyU
python3 scripts/backup_supabase.py
```

### List existing backups

```bash
python3 scripts/backup_supabase.py --list
```

### Clean up old backups (keep last 30 days)

```bash
python3 scripts/backup_supabase.py --clean
```

### Send a backup to Telegram

```bash
LATEST=$(ls -t /home/ubuntu/backups/healthyu/healthyu-*.json.gz | head -1)
# Use Hermes' send_message tool with MEDIA:$LATEST
```

## Restore procedure

### When to restore

- Supabase project is accidentally deleted (like 2026-06-18)
- Database corruption
- Migrating to a new Supabase project

### Steps

1. **Create a new Supabase project** (via dashboard or `POST /v1/projects`)
   - Region: `ap-southeast-1` (Singapore, same as original)
   - Note the project URL, anon key, service_role key

2. **Apply all migrations** from `supabase/migrations/`

   ```bash
   cd /home/ubuntu/projects/HealthyU
   # Set env vars for new project
   export SUPABASE_URL="https://NEW-REF.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="..."
   # Run each migration via management API
   for f in supabase/migrations/*.sql; do
     curl -X POST "$SUPABASE_URL/database/query" \
       -H "Authorization: Bearer $MGMT_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"query\": $(jq -Rs . < "$f")}"
   done
   ```

3. **Restore data from backup**

   ```python
   import gzip, json, urllib.request

   with gzip.open("healthyu-DATE.json.gz", "rt") as f:
       backup = json.load(f)

   service_role = "..."
   base = "https://NEW-REF.supabase.co/rest/v1"

   for table, rows in backup["data"].items():
       if not rows:
           continue
       # Insert in batches of 1000 to avoid request size limits
       for i in range(0, len(rows), 1000):
           batch = rows[i:i+1000]
           req = urllib.request.Request(
               f"{base}/{table}",
               data=json.dumps(batch).encode(),
               headers={
                   "apikey": service_role,
                   "Authorization": f"Bearer {service_role}",
                   "Content-Type": "application/json",
                   "Prefer": "resolution=ignore-duplicates"
               },
               method="POST"
           )
           urllib.request.urlopen(req).read()
   ```

4. **Re-apply Supabase auth config**
   - Set `site_url` to `https://healthyu.web.id/`
   - Set `uri_allow_list` to include production + localhost
   - Reconfigure Google OAuth (if used)

5. **Update CF Worker env vars** (via `wrangler secret put`):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ACCESS_TOKEN`

6. **Update `wrangler.jsonc`** vars block (SUPABASE_URL, etc.)

7. **Commit + push** the wrangler.jsonc changes, trigger deploy

8. **Verify** production routes work

## Why this approach

- **Free**: No paid Supabase PITR, no R2 subscription, no third-party service
- **Off-site**: Backups sent to Telegram (operator's phone) = immune to VPS loss
- **Simple**: Pure Python 3, no extra dependencies, easy to read/audit
- **Self-healing**: Cron + retention = old backups auto-pruned
- **Auditable**: 30-day history visible via `--list`

## Limitations

- **24h data loss max** (daily snapshot, not real-time)
- **No auth.users table data** — PostgREST doesn't expose auth schema
  via service_role. Auth users need to re-register or be restored via
  Supabase dashboard "Users" import.
- **No storage objects** — files in storage buckets NOT backed up
  (would need separate Supabase Storage API integration)

## Disaster recovery time

| Step                | Time                             |
| ------------------- | -------------------------------- |
| Create new project  | 2 min                            |
| Apply 78 migrations | 1 min                            |
| Restore data        | 2-5 min (depends on backup size) |
| Re-configure auth   | 2 min                            |
| Update CF env vars  | 5 min                            |
| Deploy              | 1 min                            |
| Verify              | 2 min                            |
| **Total**           | **~15-20 min**                   |

vs Without backup: **infinite** (data gone forever)
