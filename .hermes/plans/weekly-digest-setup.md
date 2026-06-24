# Weekly Pattern Digest Email

**Status:** Code complete, awaiting GitHub Actions scheduler

## Ponytail Design

**No new cron slot** — Cloudflare at 3/3 capacity.

**Solution:** API endpoint + GitHub Actions scheduler (free tier: unlimited workflows).

## Features

- **Top 3 patterns** per user from last 7 days
- **100 emails/day** max (Cloudflare Email Workers free tier)
- **Auth protected** (Bearer token required)
- **HTML + plain text** emails
- **Graceful degradation** (skips users after 100, logs errors)

## Architecture

```
GitHub Actions (Monday 2am UTC)
  ↓ POST /api/sendWeeklyDigests
  ↓ Authorization: Bearer <secret>
  ↓
CF Workers (weeklyDigest.functions.ts)
  ↓ Query Supabase (patterns from last 7 days)
  ↓ Group by user (top 3 by urgency)
  ↓ Loop: max 100 emails
  ↓
MailChannels API (free via CF Email Workers)
  ↓
User inbox: 📊 Ringkasan Mingguan
```

## Setup (Next Step)

### 1. Add GitHub Actions Workflow

File: `.github/workflows/weekly-digest.yml`

```yaml
name: Weekly Digest

on:
  schedule:
    - cron: "0 2 * * 1" # Monday 2am UTC (9am WIB)
  workflow_dispatch: # Manual trigger for testing

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Send Weekly Digests
        run: |
          curl -X POST "https://healthyu.web.id/api/sendWeeklyDigests" \
            -H "Authorization: Bearer ${{ secrets.DIGEST_SECRET }}" \
            -H "Content-Type: application/json" \
            -w "\nStatus: %{http_code}\n"
```

### 2. Add Secret to GitHub

1. Open: https://github.com/afifghaffarr-source/HealthyU/settings/secrets/actions
2. Click **New repository secret**
3. Name: `DIGEST_SECRET`
4. Value: `healthyu_digest_2026` (atau ganti random string)
5. Click **Add secret**

### 3. Test Manual Run

1. Go to: https://github.com/afifghaffarr-source/HealthyU/actions/workflows/weekly-digest.yml
2. Click **Run workflow** dropdown
3. Click **Run workflow** button
4. Wait ~30s, check logs

## Email Preview

**Subject:** 📊 Ringkasan Pola Makan Mingguan

**Body:**

```
📊 Ringkasan Mingguan
Pola makan 7 hari terakhir

┌──────────────────────────────────────┐
│ 1. Sering Skip Sarapan               │
│    Kamu melewatkan sarapan 4 dari... │
├──────────────────────────────────────┤
│ 2. Makan Malam Larut                 │
│    Makan setelah jam 9 malam serin...│
├──────────────────────────────────────┤
│ 3. Konsumsi Gula Berlebih            │
│    Asupan gula harianmu 2x lebih...  │
└──────────────────────────────────────┘

         [ Lihat Detail ]

HealthyU • healthyu.web.id
```

## Free Tier Compliance

| Resource              | Usage           | Limit     | Status         |
| --------------------- | --------------- | --------- | -------------- |
| MailChannels          | 100 emails/week | 100/day   | ✅ Well within |
| GitHub Actions        | 1 workflow      | Unlimited | ✅ Free tier   |
| CF Workers (API call) | +100 req/week   | 100K/day  | ✅ <0.1%       |

**Total cost:** $0 (stays 100% free tier)

## Testing

**Dry run (no emails sent):**

```bash
curl -X POST "http://localhost:3000/api/sendWeeklyDigests" \
  -H "Authorization: Bearer healthyu_digest_2026" \
  -H "Content-Type: application/json"
```

**Production test (Monday only, or manual trigger):**

1. GitHub Actions → Run workflow
2. Check logs for `sent=X, skipped=Y, errors=[]`
3. Verify email received in inbox

## Error Handling

- **Auth fail:** HTTP 500 "Unauthorized"
- **Supabase down:** Returns `{sent: 0, skipped: 0, errors: ["Query failed"]}`
- **MailChannels fail:** Skips user, logs error, continues
- **100 limit hit:** Remaining users skipped with warning

## Next Enhancements

1. **User preferences:** Opt-in/out via settings
2. **Digest frequency:** Daily/weekly/monthly toggle
3. **Custom time:** User picks delivery time (morning/evening)
4. **Trend charts:** Include improvement graphs in email
5. **A/B testing:** Track open rates, click rates

---

**Current status:** Code complete ✅  
**Pending:** GitHub Actions setup (5 minutes)  
**Recommendation:** Test with workflow_dispatch first, then enable cron
