# Cloudflare Pages Deployment Guide

Step-by-step for first-time deploy of HealthyU on Cloudflare Pages, after
the Lovable-decouple migration.

> **Prerequisites**:
> - Self-managed Supabase project ready (see `docs/supabase-migration.md`)
> - VexoAPI VIP key (https://vexoapi.dev/server/login)
> - Cloudflare account with at least one domain managed (or use `*.pages.dev`)

---

## 1. Create the Cloudflare Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create application** → **Pages** → **Direct Upload** (or **Connect to Git**)
2. **Project name**: `healthyu` (becomes `healthyu.pages.dev`)
3. **Production branch**: `main`
4. **Build command**: `bun run build`
5. **Build output directory**: `dist`
6. **Root directory**: `/` (leave default; the repo IS the project)
7. **Environment variables**: see §3 below
8. **Compatibility flags**: `nodejs_compat` (in Compatibility settings)
9. **Compatibility date**: latest stable (e.g. `2024-09-23`)

If using **Direct Upload** instead of Git:
```bash
# Install wrangler
npm i -g wrangler
# Login
wrangler login
# Build
bun run build
# Deploy
wrangler pages deploy dist --project-name=healthyu --commit-dirty=true
```

---

## 2. Compatibility settings

In the Cloudflare Pages project → **Settings** → **Functions**:
- **Compatibility date**: latest stable (Cloudflare picks this on new projects)
- **Compatibility flags**: `nodejs_compat`

This is required because:
- `process.env` is used in many server-only files (env access is a Node API)
- Several `@supabase/supabase-js` paths use Node built-ins
- The previous Lovable config already assumed `nodejs_compat`

---

## 3. Environment variables

Cloudflare Pages → **Settings** → **Environment variables**. Add for BOTH
**Production** and **Preview** environments.

### 3.1 Build-time vars (client bundle — `VITE_*` prefix)

These get inlined into the JS bundle at build time. Set as
"Build environment variables" or "Plaintext" — same effect.

| Key | Example value | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://abc.supabase.co` | Self-managed project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | `abcdefghijkl` | Ref only (not full URL) |

### 3.2 Runtime vars (server functions only)

| Key | Example value | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `https://abc.supabase.co` | Same as VITE |
| `SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Same as VITE |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **NEVER** expose to client |
| `VEXO_API_KEY` | `GZlX5vCq-aKtz4M-` | Rotate at vexoapi.dev |
| `VEXO_BASE_URL` | `https://vexoapi.dev` | Default — only override for self-hosted proxy |
| `CRON_SECRET` | `<64-hex-chars>` | `openssl rand -hex 32` |
| `VAPID_SUBJECT` | `mailto:admin@healthyu.id` | For Web Push |
| `VAPID_PRIVATE_KEY` | (from web-push library) | Generate with `web-push generate-vapid-keys` |
| `GOOGLE_FIT_CLIENT_ID` | `<...>.apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_FIT_CLIENT_SECRET` | `<...>` | Same |

---

## 4. First deploy

After the project is created and env vars set:

1. **Git deploy**: push to `main` → Cloudflare Pages auto-builds
2. **Direct upload**: run `wrangler pages deploy dist --project-name=healthyu`

Watch the build log for the first 5 minutes. Common issues:
- "Module not found" → usually a missing env var
- "Cannot find package @lovable/..." → shouldn't happen, we removed those
- Build succeeds but 500 on first request → check function logs in CF dashboard

---

## 5. Custom domain

1. Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. Enter `healthyu.id` (or your domain)
3. If domain is on Cloudflare already: automatic CNAME setup
4. If elsewhere: add the CNAME they show you at your registrar

SSL is automatic via Cloudflare Universal SSL (no action needed).

---

## 6. Post-deploy checklist

- [ ] First load of `https://healthyu.pages.dev` returns 200
- [ ] CSP header present (check DevTools → Network → first HTML response)
- [ ] Sign up with email → confirmation email arrives
- [ ] Sign in with Google OAuth works
- [ ] Log a meal → row appears in `public.meal_logs`
- [ ] AI chat returns a response (or 503 if VexoAPI upstream is down)
- [ ] Trigger `x-cron-secret` POST to `/api/public/hooks/daily-content` → 200
- [ ] Check `public.error_reports` after a few minutes of usage

---

## 7. Monitoring

- **Logs**: Cloudflare Pages → Logs → Real-time / Historical
- **Errors**: query `public.error_reports` in Supabase SQL editor
  ```sql
  select created_at, severity, boundary, message, route
  from public.error_reports
  order by created_at desc
  limit 50;
  ```
- **AI cost**: query `public.ai_usage_logs`
  ```sql
  select date_trunc('hour', created_at) as hour,
         sum(cost_usd) as cost,
         count(*) as calls
  from public.ai_usage_logs
  where created_at > now() - interval '24 hours'
  group by 1
  order by 1 desc;
  ```

---

## 8. Common post-deploy fixes

### "VEXO_API_KEY missing"
Add the var in CF dashboard, then **redeploy** (env vars don't hot-reload
in the Worker).

### "CORS error on AI call"
The browser shouldn't call VexoAPI directly (all AI goes through server
functions). If you see this, a feature accidentally bypassed the gateway.
Check browser console for the offending URL.

### "Cron returns 401"
The Cloudflare Pages env var `CRON_SECRET` differs from the one in the
Supabase `cron.schedule(...)` body. Update the cron definition, or
re-issue the secret in both places.

### "OAuth callback fails"
Add the new domain to Supabase → Authentication → URL Configuration →
"Additional Redirect URLs". Format: `https://healthyu.id/auth/callback`
(no trailing slash).

---

## 9. Custom domain + DNS cutover

When ready to point `healthyu.id` from old (Lovable) to new (Cloudflare):

1. Lower DNS TTL to 5 minutes at least 24h before cutover
2. Add the domain in Cloudflare Pages (see §5)
3. After Cloudflare shows "Active" status for the domain:
   - Remove old DNS record at registrar (if it was hosted elsewhere)
   - Or, if domain is on Cloudflare: just add the CNAME they provide
4. Watch error rates for 24h

Rollback: re-add the old DNS record pointing to Lovable Cloud. With 5-min
TTL, the rollback is effective within minutes.
