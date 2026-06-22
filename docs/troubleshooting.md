# Troubleshooting Guide — HealthyU

Panduan ini membantu mendiagnosis dan menyelesaikan masalah umum di production.

## Quick Diagnostics

### Cek Status Production

```bash
# Health check semua endpoint
bun run scripts/health-check.ts

# Real-time logs dari Cloudflare Workers
export CLOUDFLARE_API_TOKEN=*** ~/.config/healthyu/cf-token)
wrangler tail

# Cek error terakhir di database
bun run scripts/check-errors.ts --limit 10

# Cek backup status
ls -lh ~/backups/healthyu/ | tail -5
```

---

## Common Issues

### 1. Production Down (502/504 Errors)

**Symptoms:**

- Landing page returns 502 Bad Gateway
- Health API timeout
- Users report "site tidak bisa diakses"

**Diagnosis:**

```bash
# Check if Cloudflare Workers is responding
curl -I https://healthyu.web.id/

# Check wrangler tail for errors
wrangler tail | grep -i "error\|exception"

# Check Cloudflare status
# https://www.cloudflarestatus.com/
```

**Common Causes:**

#### A. Worker Threw Uncaught Exception

**Symptoms in wrangler tail:**

```
Uncaught TypeError: Cannot read property 'x' of undefined
  at handler (worker.js:123:45)
```

**Solution:**

1. Identify the failing route from the error stack
2. Check recent deployments: `git log --oneline -10`
3. Rollback to last working version:
   ```bash
   wrangler rollback
   ```
4. Fix the bug locally and redeploy

#### B. Supabase Connection Failed

**Symptoms in wrangler tail:**

```
FetchError: request to https://ohkfcldkuzfcxnpqvdvc.supabase.co failed
```

**Solution:**

1. Check Supabase status: https://status.supabase.com/
2. Verify Supabase credentials in Cloudflare Workers secrets:
   ```bash
   wrangler secret list
   ```
3. Test Supabase directly:
   ```bash
   curl https://ohkfcldkuzfcxnpqvdvc.supabase.co/rest/v1/ \
     -H "apikey: $SUPABASE_ANON_KEY"
   ```

#### C. Out of Memory / CPU Limit Exceeded

**Symptoms in wrangler tail:**

```
Worker exceeded CPU time limit (50ms)
```

or

```
Worker exceeded memory limit (128MB)
```

**Solution:**

1. Check which route is slow:
   ```bash
   wrangler tail --format json | jq 'select(.cpuTime > 40)'
   ```
2. Profile the route locally:
   ```bash
   bun run dev
   # Visit the slow route, check Network tab
   ```
3. Optimize:
   - Lazy load heavy components
   - Reduce database queries (use `.select()` to limit fields)
   - Cache expensive computations

---

### 2. Database Errors

#### A. "relation does not exist"

**Symptoms:**

```
PostgreSQL error: relation "user_profiles" does not exist
```

**Causes:**

- Migration not applied
- Wrong Supabase project (dev vs prod)

**Solution:**

```bash
# Check which migrations are applied
supabase migration list

# Apply missing migrations
supabase db push

# Verify table exists
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

#### B. "permission denied for table"

**Symptoms:**

```
PostgreSQL error: permission denied for table user_profiles
```

**Causes:**

- RLS (Row Level Security) policy blocking access
- Using anon key instead of service_role key

**Solution:**

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Temporarily disable RLS for debugging (NEVER in production)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Fix RLS policy
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);
```

#### C. "duplicate key value violates unique constraint"

**Symptoms:**

```
PostgreSQL error: duplicate key value violates unique constraint "user_profiles_pkey"
```

**Causes:**

- Trying to insert duplicate primary key
- Race condition in concurrent inserts

**Solution:**

```sql
-- Use UPSERT instead of INSERT
INSERT INTO user_profiles (user_id, name)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
  SET name = EXCLUDED.name;
```

---

### 3. Authentication Issues

#### A. "Invalid API key"

**Symptoms:**

```
Supabase error: Invalid API key
```

**Causes:**

- Wrong SUPABASE_ANON_KEY in environment
- Key rotated in Supabase dashboard but not updated in Workers

**Solution:**

```bash
# Get current anon key from Supabase dashboard
# Settings > API > Project API keys > anon public

# Update Cloudflare Workers secret
wrangler secret put SUPABASE_ANON_KEY
# Paste the key

# Verify
wrangler secret list | grep SUPABASE
```

#### B. "JWT expired"

**Symptoms:**

```
Auth error: JWT expired
```

**Causes:**

- User session expired
- Clock skew between client and server

**Solution:**

1. User should refresh page to get new token
2. Check server time:
   ```bash
   date -u
   # Should match: https://time.is/UTC
   ```
3. If persistent, check JWT validation code in `src/lib/auth.ts`

#### C. Google OAuth Not Working

**Symptoms:**

- "Sign in with Google" button does nothing
- Redirect loop after OAuth

**Solution:**

1. Check Google Cloud Console:
   - OAuth client ID configured
   - Redirect URI includes: `https://ohkfcldkuzfcxnpqvdvc.supabase.co/auth/v1/callback`
2. Check Supabase Auth settings:
   - Google provider enabled
   - Client ID and Secret correct
3. Test OAuth flow manually:
   ```bash
   curl -I https://ohkfcldkuzfcxnpqvdvc.supabase.co/auth/v1/authorize?provider=google
   ```

---

### 4. Build & Deployment Issues

#### A. Build Fails in CI

**Symptoms:**

- GitHub Actions job fails
- Error: `Type error: Cannot find module 'xyz'`

**Solution:**

```bash
# Reproduce locally
bun install
bun run build

# If it fails, fix the error
# Common fixes:
# - Missing dependency: bun add xyz
# - Type error: fix the TypeScript issue
# - Import error: check file path

# Commit and push
git add .
git commit -m "fix: resolve build error"
git push
```

#### B. Deployment Stuck / Pending

**Symptoms:**

- Cloudflare deployment shows "Pending" for > 10 minutes
- No logs in wrangler tail

**Solution:**

```bash
# Check Cloudflare status
# https://www.cloudflarestatus.com/

# Cancel and retry deployment
wrangler deployments list
wrangler rollback  # to last working version

# Manual deploy
bun run build
wrangler pages deploy dist
```

#### C. Environment Variables Not Updating

**Symptoms:**

- New secret not available in production
- `wrangler secret list` shows old value

**Solution:**

```bash
# Secrets update immediately, but need redeploy
wrangler secret put MY_SECRET
# Enter new value

# Trigger redeploy
wrangler pages deploy dist

# Verify in production
wrangler tail | grep MY_SECRET
```

---

### 5. Performance Issues

#### A. Slow Page Load (> 3s)

**Diagnosis:**

```bash
# Check Lighthouse score
npx lighthouse https://healthyu.web.id/ --view

# Check bundle size
bun run build
ls -lh dist/static/js/*.js | sort -k5 -h

# Check database query times
wrangler tail --format json | jq 'select(.event.request.url | contains("/api/"))'
```

**Common Causes:**

1. **Large JavaScript bundle**
   - Solution: Use code splitting, lazy loading
   - Check: `bun run build --stats`

2. **Slow database queries**
   - Solution: Add indexes, optimize queries
   - Check:
     ```sql
     EXPLAIN ANALYZE SELECT * FROM user_profiles WHERE user_id = $1;
     ```

3. **Unoptimized images**
   - Solution: Use WebP, lazy loading, CDN
   - Check: Lighthouse "Opportunities" section

#### B. High Error Rate (> 5%)

**Diagnosis:**

```bash
# Check error rate in last hour
bun run scripts/check-errors.ts --hours 1

# Check Cloudflare analytics
# Dashboard > Workers > healthyu > Analytics

# Check specific error
wrangler tail | grep "Error:"
```

**Solution:**

1. Identify top errors from `error_reports` table
2. Reproduce locally
3. Fix and deploy
4. Monitor error rate post-fix

---

### 6. Cron Jobs Not Running

#### A. Daily Backup Not Running

**Symptoms:**

- No new files in `~/backups/healthyu/`
- No Telegram notification

**Diagnosis:**

```bash
# Check crontab
crontab -l

# Check cron logs
tail -50 /var/log/healthyu-backup.log

# Test manually
bun run scripts/backup-database.ts
```

**Common Causes:**

1. **Cron not installed**

   ```bash
   # Reinstall
   (crontab -l; echo "0 3 * * * cd ~/projects/HealthyU && bun run scripts/backup-database.ts >> /var/log/healthyu-backup.log 2>&1") | crontab -
   ```

2. **Bun not in PATH**

   ```bash
   # Use absolute path
   which bun
   # Update crontab with full path: /home/ubuntu/.bun/bin/bun
   ```

3. **Script error**
   ```bash
   # Check logs
   cat /var/log/healthyu-backup.log | tail -20
   # Fix the error in the script
   ```

#### B. Supabase Cron Triggers Not Firing

**Symptoms:**

- `/api/public/hooks/*` endpoints not called
- Scheduled tasks not running

**Diagnosis:**

```bash
# Check Supabase cron triggers
supabase db remote commit --schema public
psql $DATABASE_URL -c "SELECT * FROM cron.job;"

# Test endpoint manually
curl -X POST https://healthyu.web.id/api/public/hooks/daily-coach \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Solution:**

1. Verify cron triggers in database:
   ```sql
   SELECT * FROM cron.job;
   ```
2. Recreate if missing:
   ```sql
   SELECT cron.schedule('daily-coach', '0 8 * * *', $$
     SELECT net.http_post(
       url := 'https://healthyu.web.id/api/public/hooks/daily-coach',
       headers := '{"Authorization": "Bearer ' || current_setting('app.settings.cron_secret') || '"}'::jsonb
     );
   $$);
   ```

---

### 7. Storage Issues

#### A. "Bucket not found"

**Symptoms:**

```
Storage error: Bucket not found
```

**Solution:**

```bash
# List buckets
supabase storage ls

# Create missing bucket
supabase storage create meal-photos --public
```

#### B. "File too large"

**Symptoms:**

```
Storage error: File too large (max 50MB)
```

**Solution:**

1. Compress image before upload:
   ```typescript
   // Use browser-image-compression library
   import imageCompression from "browser-image-compression";
   const compressed = await imageCompression(file, { maxSizeMB: 1 });
   ```
2. Or increase limit in Supabase dashboard:
   - Storage > Settings > File size limit

---

## Emergency Procedures

### Production Completely Down

1. **Check Cloudflare status**: https://www.cloudflarestatus.com/
2. **Rollback to last working version**:
   ```bash
   wrangler rollback
   ```
3. **Notify users** (if applicable):
   - Update status page
   - Post on social media
4. **Investigate root cause**:
   ```bash
   wrangler tail --format json > incident-logs.json
   ```
5. **Write postmortem** in `docs/postmortems/`

### Database Corruption / Data Loss

1. **Stop all writes** (disable cron triggers):
   ```sql
   SELECT cron.unschedule('job-name');
   ```
2. **Restore from backup**:
   ```bash
   # See docs/backup-restore-runbook.md
   bun run scripts/restore-backup.ts --date 2026-06-20
   ```
3. **Verify data integrity**:
   ```bash
   bun run scripts/check-errors.ts
   ```
4. **Re-enable cron triggers**

### Security Incident

1. **Rotate all secrets immediately**:
   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put CRON_SECRET
   # etc.
   ```
2. **Revoke compromised credentials** in Supabase dashboard
3. **Check audit logs**:
   ```sql
   SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;
   ```
4. **Notify affected users** if PII exposed
5. **Write security postmortem**

---

## Debugging Tools

### Local Development

```bash
# Start dev server with hot reload
bun run dev

# Run tests
bun run test

# Type check
bun run typecheck

# Lint
bun run lint
```

### Database Debugging

```bash
# Connect to production database
psql $DATABASE_URL

# Run query
SELECT * FROM user_profiles LIMIT 10;

# Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'user_profiles';

# Check table size
SELECT pg_size_pretty(pg_total_relation_size('user_profiles'));
```

### Worker Debugging

```bash
# Real-time logs
wrangler tail

# Filter logs
wrangler tail | grep "error"
wrangler tail --format json | jq '.event.request.url'

# Deploy with debug logging
wrangler pages deploy dist --branch debug
```

---

## Getting Help

1. **Check this guide** first
2. **Search existing issues**: https://github.com/afifgh/HealthyU/issues
3. **Create new issue** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error logs (wrangler tail, browser console)
   - Environment (browser, OS, version)
4. **Escalate to maintainer** if critical:
   - Telegram: @afifgh
   - Email: afif@example.com

---

## Prevention

- **Always test locally** before deploying
- **Use feature flags** for risky changes
- **Monitor error rates** daily
- **Review logs** weekly
- **Keep dependencies updated**
- **Write tests** for critical paths
- **Document decisions** in ADRs (Architecture Decision Records)
