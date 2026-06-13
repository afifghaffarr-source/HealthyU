# Supabase Migration Guide — Lovable Cloud → Standalone Project

This guide walks you through exporting data from a Lovable Cloud (managed
Supabase) instance and importing it into a self-managed Supabase project.
Target audience: the project maintainer performing the one-time migration.

> **Estimated time**: 1–2 hours for export/import, plus a few days of
> watch-and-fix for edge cases (RLS, storage, edge functions, OAuth providers).

---

## 0. Pre-flight Checklist

- [ ] Self-managed Supabase project created at https://supabase.com/dashboard
- [ ] Region matches Lovable Cloud (e.g. `ap-southeast-1` for Indonesian users)
- [ ] Plan: **Pro** (or higher) — needed for daily backups, point-in-time recovery
- [ ] Database password saved in your password manager
- [ ] `psql` installed locally (or use the Supabase SQL editor in dashboard)
- [ ] `supabase` CLI installed (`brew install supabase/tap/supabase` or npm)
- [ ] Lovable Cloud project URL + service_role key (Settings → API in Lovable)

---

## 1. Create the new project + apply migrations

The 73 SQL files in `supabase/migrations/` are Lovable-compatible (no
Lovable-specific extensions). They should apply cleanly to a new Supabase
project.

```bash
# 1. Link to the new project
supabase link --project-ref <new-project-ref>

# 2. Apply all migrations in order
supabase db push

# 3. Verify schema
psql "$DATABASE_URL" -c "\dt" | wc -l
# Expected: 91+ tables
```

If any migration fails, **do not** continue. Inspect the SQL, fix the
difference, and re-run. Common issues:
- Lovable Cloud might have applied some migrations with different `now()`
  values for defaults
- Some Lovable-only extensions (if any) may not exist in vanilla Supabase

---

## 2. Export data from Lovable Cloud

### 2.1 Schema + data dump (recommended for small/medium projects)

Use the Lovable Cloud DB connection string (Settings → Database → Connection
String → "Direct connection", port 5432):

```bash
# From your local machine
pg_dump "postgres://postgres:<password>@<lovable-host>:5432/postgres" \
  --no-owner --no-privileges \
  --exclude-schema=auth,storage,graphql,supabase_functions,extensions \
  --exclude-table-data=storage.migrations \
  --file=lovable_dump_$(date +%Y%m%d).sql
```

This dumps your **public schema** only (auth/users live in a separate schema
and will be migrated differently — see §3).

### 2.2 Storage buckets

Storage objects (progress photos, story media, etc.) are NOT included in
`pg_dump` — they live on disk. Two options:

**Option A: Manual copy via Supabase Dashboard** (works for <1k files)
1. Old project: Storage → bucket → select files → Download (or use `supabase
   storage download` CLI for batch)
2. New project: Storage → Create matching bucket (with same RLS policies),
   upload files

**Option B: Use the Supabase Storage API** (programmatic, scales better)
```bash
# List all objects in a bucket on old project
supabase storage ls "progress-photos" --project-ref <old-ref> --experimental
# Download all (pseudo-script — adapt as needed)
```

For now, **most HealthyU uploads are user-generated and ephemeral** (cached
in IndexedDB; primary store is DB rows referencing URLs that may need
re-upload). Document any data loss with the user.

### 2.3 Edge functions (if any)

Lovable Cloud may have deployed Supabase Edge Functions that aren't in this
repo. Check:
- Lovable Cloud → Edge Functions
- Copy each function to `supabase/functions/<name>/index.ts` in this repo
- Re-deploy: `supabase functions deploy <name> --project-ref <new-ref>`

---

## 3. Migrate users + auth

**This is the hardest step.** Two options:

### Option A: Magic link re-auth (zero-effort, but breaks password logins)
1. Import only public schema data (no `auth.users`)
2. Send an email to all users: "HealthyU moved — please sign in via magic link"
3. On first sign-in via magic link, Supabase creates a new `auth.users` row
4. Write a one-time data-merge script that joins old_user_id → new_user_id
   by email (only for users who have already re-authenticated)

Pros: simple, no password reset
Cons: requires user action; loses password history

### Option B: Full auth migration (preserves passwords, requires Supabase support)
1. Contact Supabase support for a managed `auth.users` migration
2. They will provide a secure SFTP / dashboard import for the `auth` schema
3. After import, `auth.users.id` is preserved → all RLS keys still work

Pros: zero user-facing impact
Cons: requires Pro plan, takes days, paid service in some cases

**Recommendation for HealthyU**: Option A. Indonesian user base is small and
re-auth is a small UX cost. Send the email in Indonesian + English.

---

## 4. Re-configure Auth providers

In the **new** Supabase project:

1. **Authentication → URL Configuration**
   - Site URL: `https://healthyu.id` (your Cloudflare Pages domain)
   - Additional Redirect URLs: add `https://healthyu.id/auth/callback`,
     `http://localhost:8080/auth/callback` (for dev)

2. **Authentication → Providers**
   - **Google**: paste the same OAuth client ID + secret as the old project
     (from Google Cloud Console). Authorized redirect URI must include the
     new project's callback URL (`https://<new-ref>.supabase.co/auth/v1/callback`)
   - Any other providers used: same re-paste flow

3. **Authentication → Email Templates** — copy the customized templates from
   the old project (Lovable Cloud → Auth → Templates)

---

## 5. Apply RLS, secrets, and post-migration tasks

### 5.1 Verify RLS

```sql
-- Should return ~91 rows (one per user-data table)
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and rowsecurity = true;
```

If any tables are missing RLS, re-apply the relevant migration. Each
migration includes `alter table ... enable row level security;`.

### 5.2 Move secrets

| Old location (Lovable Cloud)         | New location                                    |
| ----------------------------------- | ----------------------------------------------- |
| Settings → Secrets                  | Cloudflare Pages → Environment variables        |
| `GEMINI_API_KEY`                    | `VEXO_API_KEY` (rotated — different provider)   |
| `CRON_SECRET`                       | `CRON_SECRET` (same value is fine, or rotate)   |
| `VAPID_*`                           | Same (Cloudflare Pages env)                     |
| `GOOGLE_FIT_*`                      | Same (Cloudflare Pages env)                     |
| `SUPABASE_SERVICE_ROLE_KEY`         | Same (Cloudflare Pages env, **server only**)    |

### 5.3 Update OAuth state table

The `oauth_states` table from migration `..._oauth_states.sql` is preserved.
After users re-auth, fresh rows are written with new `user_id` values.

### 5.4 Update cron jobs (when you have your CF Pages URL)

See `docs/cron.md`. Replace the placeholder URL in the SQL examples with
your real Cloudflare Pages domain (e.g. `healthyu.pages.dev` or
`healthyu.id`).

### 5.5 Test end-to-end

Smoke test:
- [ ] Sign up with email + password (creates new `auth.users`)
- [ ] Sign in
- [ ] Log a meal
- [ ] Trigger AI scan (image)
- [ ] Send chat message
- [ ] Check `public.ai_usage_logs` has a new row
- [ ] Check `public.error_reports` accepts writes (dev tools → throw → boundary catches)
- [ ] Check `public.rate_limit_logs` updates
- [ ] Trigger a cron hook with `x-cron-secret` header → 200
- [ ] Trigger without secret → 401

---

## 6. Cutover checklist (D-day)

- [ ] DNS for `healthyu.id` still points to Lovable (old)
- [ ] Last data sync completed
- [ ] Cloudflare Pages env vars set with new project secrets
- [ ] First Cloudflare Pages deploy succeeded (preview URL works)
- [ ] All smoke tests pass on preview URL
- [ ] Update cron job URLs in Supabase DB (point to CF Pages domain)
- [ ] DNS cutover: point `healthyu.id` to Cloudflare Pages
- [ ] Watch error_reports for 24h
- [ ] If clean: leave Lovable Cloud running for 30 days (read-only), then
      delete

---

## 7. Rollback plan

If something breaks after cutover:
1. Revert DNS to old Lovable Cloud URL (5-minute TTL if you set it)
2. Re-point cron URLs back to Lovable Cloud
3. Investigate via `error_reports` + Cloudflare Pages build logs
4. Fix forward (preferred) or extend the parallel-run window

---

## 8. After 30 days

- [ ] Export final DB backup from Lovable Cloud
- [ ] Save to long-term storage (S3 / Google Drive) — your last fallback
- [ ] Delete Lovable Cloud project (or downgrade to free + delete)
- [ ] Remove `@lovable/*` references from the repo (we already did this, but
      a final grep doesn't hurt)

```bash
grep -r "lovable" --include="*.ts" --include="*.tsx" --include="*.md" .
# Expected: 0 hits
```
