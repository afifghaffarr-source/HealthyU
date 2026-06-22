# Monitoring & Alerting — HealthyU

## Overview

HealthyU uses a multi-layer monitoring approach:

1. **Cloudflare Workers Analytics** — request volume, error rates, CPU time
2. **Supabase error_reports table** — client-side errors + PII audit logs
3. **Wrangler Tail** — real-time log streaming for debugging
4. **Health endpoints** — synthetic checks for uptime monitoring
5. **Backup alerts** — daily backup status via Telegram

## Cloudflare Workers Analytics

**Dashboard:** https://dash.cloudflare.com → Workers & Pages → healthyu → Analytics

**Metrics available:**

- Requests per minute/hour/day
- Error rate (4xx, 5xx)
- CPU time per request (budget: 10ms CPU = 50ms wall time)
- Bandwidth
- Geographic distribution

**Alerts (setup via CF Dashboard):**

- Error rate > 5% for 5 minutes → email/Telegram
- CPU time > 50ms avg for 10 minutes → investigate bottleneck

## Supabase Error Tracking

**Table:** `public.error_reports`

**Schema:**

```sql
id, user_id, error_message, error_stack, url, user_agent, created_at
```

**Query last 24h errors:**

```sql
SELECT COUNT(*), error_message
FROM error_reports
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY COUNT(*) DESC
LIMIT 10;
```

**Monitor script (manual):**

```bash
cd /home/ubuntu/projects/HealthyU
bun run scripts/check-errors.ts
```

## Real-Time Log Streaming

**Wrangler Tail** — live log stream from CF Workers:

```bash
cd /home/ubuntu/projects/HealthyU
export PATH="$HOME/.bun/bin:$PATH"
export CLOUDFLARE_API_TOKEN=*** ~/.config/healthyu/cf-token)
wrangler tail
```

**Use cases:**

- Debug production issues in real-time
- Watch cron job execution
- Monitor AI API calls (VexoAPI latency)
- Trace user authentication flow

**Filter examples:**

```bash
wrangler tail --format json | jq 'select(.outcome == "exception")'
wrangler tail --format json | jq 'select(.event.request.url | contains("/api/"))'
```

## Health Endpoints

**Uptime monitoring** — check these endpoints every 5 minutes:

| Endpoint                                                 | Method | Expected                  | Purpose          |
| -------------------------------------------------------- | ------ | ------------------------- | ---------------- |
| `https://healthyu.web.id/`                               | GET    | 200 OK                    | Landing page SSR |
| `https://healthyu.web.id/api/health`                     | GET    | `{"status":"ok"}`         | Worker health    |
| `https://healthyu.web.id/api/public/hooks/daily-content` | POST   | 200 OK (with CRON_SECRET) | Cron hook        |

**UptimeRobot setup (free tier):**

- Monitor: `https://healthyu.web.id/api/health`
- Interval: 5 minutes
- Alert: Email + Telegram webhook

**Custom health check script:**

```bash
cd /home/ubuntu/projects/HealthyU
bun run scripts/health-check.ts
```

## Backup Monitoring

**Daily backup** — runs at 03:00 UTC via crontab:

```bash
# Check last backup
ls -lh /home/ubuntu/backups/healthyu/ | tail -5

# Check cron logs
tail -50 /var/log/healthyu-backup.log
```

**Alert on failure:**

- Telegram message sent automatically on backup failure
- Manual check: `grep -i "error\|failed" /var/log/healthyu-backup.log`

## Database Monitoring

**Supabase Dashboard:**

- https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc
- Database → Replication → lag should be < 1s
- Database → Connections → should be < 80% of limit
- Logs → Database → check for slow queries

**Query performance:**

```sql
-- Slow queries (> 1s)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

## Application Metrics

**AI usage tracking** — table `ai_usage_logs`:

```sql
-- Daily AI cost estimate
SELECT
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(prompt_tokens + completion_tokens) as total_tokens
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Chat safety monitoring** — PII detection logs:

```sql
-- PII detected in last 24h
SELECT COUNT(*), pii_kinds
FROM audit_log
WHERE event_type = 'pii_detected'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY pii_kinds;
```

## Alerting Strategy

**Critical alerts (immediate action):**

- Production down (health check fails 3x in 5 min)
- Error rate > 10% for 5 min
- Backup failed 2 days in a row

**Warning alerts (investigate within 24h):**

- Error rate > 5% for 1 hour
- CPU time avg > 50ms for 1 hour
- AI cost > $10/day

**Info alerts (review weekly):**

- New error types in error_reports
- Slow queries (> 1s avg)
- Storage usage > 80%

## Incident Response

**Step 1: Identify**

- Check UptimeRobot/health endpoint
- `wrangler tail` for real-time logs
- Query `error_reports` for recent errors

**Step 2: Mitigate**

- Rollback CF Worker: `wrangler rollback <version-id>`
- Restart cron jobs: `crontab -e` → comment/uncomment

**Step 3: Investigate**

- Supabase logs: Dashboard → Logs → Database
- CF Worker logs: `wrangler tail --format json | jq ...`
- Git log: `git log --oneline --since="1 hour ago"`

**Step 4: Resolve**

- Fix bug → PR → CI → deploy
- Update docs with postmortem

## Monitoring Checklist (Weekly)

- [ ] Check UptimeRobot: 99.9% uptime target
- [ ] Review error_reports: top 10 errors, fix critical
- [ ] Check backup logs: last 7 days success
- [ ] Review AI cost: within budget ($10/day)
- [ ] Check CF Workers: error rate < 1%, CPU time < 10ms avg
- [ ] Database: connections < 80%, no slow queries

## Tools Reference

| Tool          | Command                                 | Purpose                       |
| ------------- | --------------------------------------- | ----------------------------- |
| Wrangler tail | `wrangler tail`                         | Real-time CF Worker logs      |
| Health check  | `bun run scripts/health-check.ts`       | Synthetic uptime check        |
| Error query   | `bun run scripts/check-errors.ts`       | Top errors from error_reports |
| Backup status | `ls -lh ~/backups/healthyu/ \| tail -5` | Recent backups                |
| Cron logs     | `tail -50 /var/log/healthyu-backup.log` | Backup cron output            |

## Future Improvements

**Planned (Q3 2026):**

- Sentry.io integration (error tracking + performance monitoring)
- Grafana dashboard (CF Workers + Supabase metrics)
- PagerDuty alerts (critical incidents → SMS)
- Automated load testing (k6.io weekly runs)

**Deferred:**

- Datadog (too expensive for current scale)
- New Relic (CF Workers native analytics sufficient)
- Custom APM (not worth the effort vs Sentry)
