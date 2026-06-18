#!/usr/bin/env python3
"""
HealthyU Supabase daily backup.

Dumps all public tables via PostgREST (using service_role key), saves as
gzipped JSON, rotates last 30 days.

Usage:
  python3 backup_supabase.py           # run backup
  python3 backup_supabase.py --list    # list existing backups
  python3 backup_supabase.py --clean   # delete backups older than 30 days
"""

import json, gzip, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Load credentials from local files
CONFIG_DIR = Path("/home/ubuntu/.config/healthyu")
BACKUP_DIR = Path("/home/ubuntu/backups/healthyu")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
RETENTION_DAYS = 30

SUPABASE_URL = (CONFIG_DIR / "supabase-url").read_text().strip()
SERVICE_ROLE = (CONFIG_DIR / "supabase-service-role-jwt").read_text().strip()
META = {
    "app": "HealthyU",
    "supabase_url": SUPABASE_URL,
    "backup_at": None,  # set below
    "tables_count": 0,
    "total_rows": 0,
    "version": "1.0.0",
}

def http_get(url, headers=None, timeout=30):
    """GET with retry."""
    headers = headers or {}
    headers.setdefault("apikey", SERVICE_ROLE)
    headers.setdefault("Authorization", f"Bearer {SERVICE_ROLE}")
    headers.setdefault("User-Agent", "healthyu-backup/1.0")
    req = urllib.request.Request(url, headers=headers)
    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 416:
                return 416, b""  # Range not satisfiable = end of pagination
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            raise
    if last_err is not None:
        raise last_err
    raise RuntimeError("HTTP request failed after 3 attempts with no captured exception")

def list_tables():
    """Get all public table names via OpenAPI introspection."""
    # Try OpenAPI first (most reliable for full table list)
    status, body = http_get(f"{SUPABASE_URL}/rest/v1/")
    if status == 200:
        defs = json.loads(body)
        # Tables appear as path keys like "/table_name" (with leading slash, not "_")
        tables = set()
        for path in (defs.get("paths") or {}).keys():
            if not path.startswith("/"):
                continue
            name = path.lstrip("/")
            if not name or name in ("",):
                continue
            # Skip internal PostgREST paths
            if name in ("rpc",):
                continue
            # Skip query-only / function endpoints (these start with "rpc/")
            if name.startswith("rpc/"):
                continue
            tables.add(name)
        if tables:
            return sorted(tables)
    raise RuntimeError("Could not enumerate tables via OpenAPI")

def dump_table(table_name, page_size=1000):
    """Fetch all rows from a table via PostgREST (paginated)."""
    rows = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&limit={page_size}&offset={offset}"
        status, body = http_get(url, timeout=60)
        if status != 200:
            print(f"  ⚠️ {table_name}: HTTP {status}, skipping ({body[:200].decode(errors='replace')[:100]})")
            return None
        if not body:
            break
        page = json.loads(body)
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows

def run_backup():
    """Main backup flow."""
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] Starting HealthyU backup")
    META["backup_at"] = started.isoformat()

    # 1. Enumerate tables
    tables = list_tables()
    print(f"  Found {len(tables)} tables in public schema")
    META["tables_count"] = len(tables)

    # 2. Dump each table
    data = {}
    failed = []
    for i, t in enumerate(tables, 1):
        try:
            rows = dump_table(t)
            if rows is not None:
                data[t] = rows
                META["total_rows"] += len(rows)
                print(f"  [{i:3d}/{len(tables)}] {t:45s}  {len(rows):>8,} rows")
            else:
                failed.append(t)
        except Exception as e:
            print(f"  [{i:3d}/{len(tables)}] {t:45s}  ❌ {type(e).__name__}: {str(e)[:100]}")
            failed.append(t)

    # 3. Save
    timestamp = started.strftime("%Y%m%d-%H%M%S")
    out_path = BACKUP_DIR / f"healthyu-{timestamp}.json.gz"
    payload = {
        "metadata": META,
        "data": data,
        "failed_tables": failed,
    }
    with gzip.open(out_path, "wt", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    size = out_path.stat().st_size
    print(f"\n  ✅ Backup saved: {out_path.name}  ({size:,} bytes / {size/1024:.1f} KB)")
    print(f"  Tables dumped: {len(data)}/{len(tables)} ({len(failed)} failed)")
    print(f"  Total rows: {META['total_rows']:,}")
    return out_path, size, failed

def clean_old():
    """Delete backups older than RETENTION_DAYS."""
    cutoff = time.time() - RETENTION_DAYS * 86400
    removed = 0
    saved = 0
    for f in BACKUP_DIR.glob("healthyu-*.json.gz"):
        if f.stat().st_mtime < cutoff:
            f.unlink()
            removed += 1
        else:
            saved += 1
    print(f"  Retention: removed {removed} old, kept {saved} recent")
    return removed, saved

def list_backups():
    """List existing backups."""
    files = sorted(BACKUP_DIR.glob("healthyu-*.json.gz"), key=lambda p: p.stat().st_mtime, reverse=True)
    print(f"  {len(files)} backups in {BACKUP_DIR}:")
    total_size = 0
    for f in files:
        size = f.stat().st_size
        total_size += size
        mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
        print(f"    {f.name}  ({size/1024:.1f} KB)  {mtime.isoformat()}")
    print(f"  Total: {len(files)} files, {total_size/1024/1024:.2f} MB")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--list":
            list_backups()
        elif sys.argv[1] == "--clean":
            clean_old()
        else:
            print(f"Unknown arg: {sys.argv[1]}")
            sys.exit(1)
    else:
        run_backup()
        clean_old()
