# HealthyU — Deployment Playbook

End-to-end deployment guide setelah `feat/lovable-decouple` merged ke `main` (PR #1 closed 2026-06-13).

## Ringkasan alur

```
┌────────────────────────────────────────────────────────────────┐
│ Step 0: VexoAPI key rotation (5 min)                           │
│ Step 1: Supabase standalone project + 74 migrations (30 min)   │
│ Step 2: VAPID + Google OAuth + cron secret (10 min)            │
│ Step 3: Cloudflare Pages project + env vars (15 min)           │
│ Step 4: DNS cutover healthyu.id (1-24 jam)                     │
│ Step 5: Smoke test di production (15 min)                      │
└────────────────────────────────────────────────────────────────┘
```

Total: ~1.5 jam kerjaan aktif + propagate DNS. Bisa lebih cepet kalau token + project id di-kasih ke gw langsung, gw eksekusi via CLI.

---

## Step 0 — VexoAPI Key Rotation (5 min, only if needed)

**Alasan:** Key yang sekarang `[REDACTED]` return `403 — upstream access denied` per audit 2026-06-13. Endpoint udah recovery (test 2026-06-13 malam: HTTP 429 = rate limit normal, bukan 403), tapi key perlu rotasi karena upstream pernah nge-block.

**Catatan 2026-06-17:** VexoAPI pindah dari `vexoapi.dev` (NXDOMAIN) ke `vexoapi.site`. Free tier sekarang 16-char nanoid, **no registration**. Lihat `docs/vexo-api-notes.md` untuk detail.

**Manual path:**

1. Buka https://vexoapi.site (klik "Generate Key", no registration)
2. Copy key (16-char nanoid, contoh: `GZlX5vCq-aKtz4M-`)
3. Test: `curl -X POST -H "Authorization: Bearer *** -H "Content-Type: application/json" -d '{"model":"openai/gpt-oss-120b:free","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' "https://vexoapi.site/api/v1/chat/completions"` → harus return `{"choices":[{"message":{"content":"..."}}]}`
4. Simpen key — bakal dipake di Step 1 (env var) dan Step 3 (CF Pages env)

**Automated path:** kasih key baru ke gw, gw test + simpan di local env + commit ke git history (jangan di-commit, cuma di-`.env` local + CF dashboard).

---

## Step 1 — Supabase Standalone (30 min)

### 1a. Create project

Di https://supabase.com/dashboard:

- New project
- Name: `healthyu-production`
- Database password: generate strong password (simpen di 1Password / secrets manager)
- Region: **Singapore (ap-southeast-1)** — closest to Indonesian users
- Plan: Free tier cukup untuk MVP, upgrade ke Pro kalau traffic naik

**Simpen:**

- `SUPABASE_PROJECT_REF` — bagian subdomain sebelum `.supabase.co` (contoh: `abcdefghij` dari `https://abcdefghij.supabase.co`)
- `SUPABASE_URL` — `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY` — Settings → API → `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → `service_role` key (RAHASIA, jangan commit)

### 1b. Apply 74 migrations

**Pakai Supabase CLI (recommended, paling cepet):**

```bash
export SUPABASE_ACCESS_TOKEN="<token dari https://supabase.com/dashboard/account/tokens>"
cd ~/projects/HealthyU
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push
```

Proses: CLI bakal apply migrations secara berurutan, respect dependency antar migration. Output: list 74 files applied.

**Pakai Dashboard SQL Editor (manual, kalau CLI ga available):**

1. Buka https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/sql/new
2. **WAJIB:** sort migrations by filename, apply secara berurutan. List:

```bash
ls supabase/migrations/*.sql | sort
```

3. Copy file #1 (`20260603045312_*`) → paste → Run → tunggu selesai
4. Ulangi sampai file #74
5. **Setiap selesai satu batch**, jalankan verification:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
   -- expect: naik dari 0 ke ~80+ tables setelah semua migrations
   ```

**Verification post-migration:**

```sql
-- Tabel utama harus ada
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- RLS aktif di semua tabel user-facing
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;
-- expect: 0 rows (semua tabel harus RLS=on, kecuali system tables)
```

### 1c. Restore data dari Lovable (kalau ada)

Kalau lo punya data user di project Lovable lama:

```bash
# Dari project Lovable (read-only):
pg_dump "$LOVABLE_DB_URL" --no-owner --no-acl > /tmp/healthyu-data.sql

# Ke project baru (write):
psql "$SUPABASE_DB_URL" < /tmp/healthyu-data.sql
```

DB connection string bisa ditemukan di Supabase Dashboard → Settings → Database → Connection string → "URI".

---

## Step 2 — Auth + VAPID + Secrets (10 min)

### 2a. Google OAuth (kalau pakai)

Di Google Cloud Console → APIs & Services → Credentials:

- OAuth 2.0 Client ID (Web application)
- Authorized redirect URIs:
  - `https://<project-ref>.supabase.co/auth/v1/callback`
  - `https://healthyu.id/auth/callback` (kalau pakai callback manual)
- Copy `Client ID` + `Client Secret`

Di Supabase Dashboard → Authentication → Providers → Google:

- Enable
- Paste Client ID + Client Secret
- Save

### 2b. VAPID keys (web push)

Generate VAPID keypair:

```bash
npx web-push generate-vapid-keys
```

Output:

- `publicKey` → set di frontend `src/lib/pushNotifications.ts`
- `privateKey` → set di `VAPID_PRIVATE_KEY` env var
- `subject` → `mailto:support@healthyu.id` (atau email lo)

### 2c. CRON_SECRET

Generate:

```bash
openssl rand -hex 32
```

Output: 64 char hex string. Set di env var `CRON_SECRET`.

---

## Step 3 — Cloudflare Pages (15 min)

### 3a. Create Pages project

Di https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git:

- Select repo: `afifghaffarr-source/HealthyU`
- Project name: `healthyu`
- Production branch: `main`
- Build settings:
  - Build command: `bun run build`
  - Build output directory: `dist`
  - Root directory: `/` (default)

### 3b. Set environment variables

Di Pages project → Settings → Environment variables, set untuk **Production** + **Preview**:

| Key                             | Value                               | Type                     |
| ------------------------------- | ----------------------------------- | ------------------------ |
| `VITE_SUPABASE_URL`             | `https://<project-ref>.supabase.co` | Build + Runtime          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `<anon key>`                        | Build + Runtime          |
| `VITE_SUPABASE_PROJECT_ID`      | `<project-ref>`                     | Build + Runtime          |
| `SUPABASE_URL`                  | `https://<project-ref>.supabase.co` | Runtime only             |
| `SUPABASE_PUBLISHABLE_KEY`      | `<anon key>`                        | Runtime only             |
| `SUPABASE_SERVICE_ROLE_KEY`     | `<service role>`                    | Runtime only (encrypted) |
| `VEXO_API_KEY`                  | `<new vexo vip key>`                | Runtime only (encrypted) |
| `VEXO_BASE_URL`                 | `https://vexoapi.site`              | Runtime only             |
| `CRON_SECRET`                   | `<64-char hex>`                     | Runtime only (encrypted) |
| `VAPID_SUBJECT`                 | `mailto:support@healthyu.id`        | Runtime only             |
| `VAPID_PRIVATE_KEY`             | `<vapid private>`                   | Runtime only (encrypted) |
| `GOOGLE_FIT_CLIENT_ID`          | (optional)                          | Runtime only             |
| `GOOGLE_FIT_CLIENT_SECRET`      | (optional)                          | Runtime only (encrypted) |

**Build environment variables** (untuk di-bundle di client):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### 3c. Set compatibility flags

Pages → Settings → Functions → Compatibility flags:

- Add: `nodejs_compat`

### 3d. First deploy

Push trigger atau manual deploy di dashboard. Cek build logs.

---

## Step 4 — Custom Domain DNS

### 4a. Add domain

Pages project → Custom domains → Set up a custom domain:

- `healthyu.id`
- `www.healthyu.id`

### 4b. DNS records

Di DNS provider (Cloudflare atau registrar):

- CNAME `www` → `healthyu.pages.dev`
- CNAME `@` (root) → `healthyu.pages.dev` (kalau provider support) atau ALIAS / ANAME

Kalau domain di Cloudflare, otomatis ke-handle. Kalau di luar (Namecheap, dll), update records manual.

### 4c. SSL

Otomatis provisioned by Cloudflare. Tunggu 5-15 menit setelah DNS propagate.

---

## Step 5 — Smoke Test (15 min)

Wajib per `deployment-verification` skill — **jangan claim "live" sebelum visual verify**.

1. **Wait for DNS propagation** (5-15 menit):

   ```bash
   dig healthyu.id +short
   # expect: Cloudflare IP
   ```

2. **Load production URL di browser**:

   ```
   https://healthyu.id
   ```

3. **Visual verification** (pake browser_vision tool):
   - Landing page render
   - Auth flow (sign in dengan Google)
   - AI scan feature (test VexoAPI working)
   - Chat (test stream + non-stream)

4. **Console check**:
   - Zero JS errors
   - Zero 404s
   - Zero CORS errors
   - Network panel: Supabase calls return 2xx

5. **Cron endpoints**:

   ```bash
   curl -X POST "https://healthyu.id/api/public/hooks/daily-content" \
     -H "X-Cron-Secret: $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{}'
   # expect: 200 OK
   ```

6. **Lighthouse** (opsional, udah ada lhci di CI):
   - Performance ≥ 80
   - Accessibility ≥ 90
   - Best Practices ≥ 90
   - SEO ≥ 90

---

## Rollback Plan

Kalau ada yang broke post-deploy:

1. **Pages**: Settings → Deployments → klik deployment sebelumnya → "Rollback to this deploy"
2. **Migrations**: Supabase CLI tidak support migration rollback otomatis. Untuk schema fixes, write repair migration baru
3. **DNS**: Re-point records ke old project dalam 5 menit
4. **VexoAPI key**: Rotate lagi kalau upstream issue balik

---

## Post-Deploy (minggu 1)

- [ ] Monitor error_reports table (3x sehari)
- [ ] Check `ai_usage_logs` buat cost tracking
- [ ] Verify cron hooks jalan (recipes-trending-snapshot, daily-coach, dll)
- [ ] Backup database: enable daily automatic backups di Supabase dashboard
- [ ] Setup uptime monitoring (UptimeRobot atau CF Workers synthetics)
- [ ] LhCI report di setiap PR — watch performance regression

---

## Quick Reference

| Tool         | Command                                                                                                                                                                                            | Source                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Supabase CLI | `supabase --version` (2.106.0)                                                                                                                                                                     | Just installed                |
| Wrangler     | `wrangler --version` (4.100.0)                                                                                                                                                                     | Just installed                |
| VexoAPI test | `curl -X POST -H "Authorization: Bearer *** -d '{"model":"openai/gpt-oss-120b:free","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' "https://vexoapi.site/api/v1/chat/completions"` | Just verified (HTTP 200 = OK) |
| DNS check    | `dig healthyu.id +short`                                                                                                                                                                           | DNS provider                  |
| Health check | `curl https://healthyu.id/api/log-error -X POST`                                                                                                                                                   | After deploy                  |

---

## Yang Bisa GW Kerjain Otomatis (kalau lo kasih):

1. **`supabase db push`** — kalo kasih `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`, gw apply 74 migrations via CLI (5 menit, vs 30 menit manual)
2. **`wrangler pages secret put`** — kalo kasih `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, gw set 13 env vars via CLI (5 menit, vs 15 menit click-click)
3. **DNS verification** — gw bisa `dig` + `curl` post-cutover
4. **Smoke test** — gw bisa pake browser_navigate + browser_vision + browser_console per `deployment-verification` skill
5. **Visual regression** — bisa compare screenshots before/after

Yang butuh lo:

- Akses ke https://supabase.com/dashboard + https://dash.cloudflare.com (atau kasih tokens)
- Akses ke https://vexoapi.site (klik "Generate Key", no registration)
- DNS provider (kalau bukan di Cloudflare)
- Confirmation kapan mau mulai

---

**Update log:**

- 2026-06-13 — Initial playbook created post PR #1 merge
