# Incident Postmortem — CI Deploy Builds Broken Worker

**Date:** 2026-06-16
**Duration:** ~6 hours (3 deploy cycles broken)
**Severity:** P1 (production degraded: 2/5 routes 500)
**Status:** ✅ **RESOLVED** in commits `401a11c6` + `a9aa33fc`

## TL;DR

CI auto-deploy was producing a Cloudflare Worker where `/artikel` and `/faq` returned HTTP 500 with `"Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY"` — even though runtime env was correctly bound (confirmed via `/api/debug/env` returning `hasSupabaseUrl: true`). The bug was **build-time**, not runtime: Vite silently inlined `undefined` for every `import.meta.env.VITE_*` in the client bundle because CI ran `bun run build` without `VITE_*` env vars in `process.env`. VPS manual deploys worked by accident because the local `.env` file (gitignored) existed on the VPS filesystem.

## Timeline

| Time (UTC)       | Event                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-15 23:00 | First regression detected after push. `/artikel` + `/faq` → 500                                                                                                                                     |
| 2026-06-15 23:30 | Manual VPS deploy restored production (`5f3647dc`)                                                                                                                                                  |
| 2026-06-16 00:00 | Added debug endpoint `/api/debug/env` to inspect runtime env                                                                                                                                        |
| 2026-06-16 00:30 | Debug endpoint confirmed runtime env IS bound (`hasSupabaseUrl: true`) — eliminates runtime env as suspect                                                                                          |
| 2026-06-16 01:00 | Compared VPS vs CI build artifacts: **byte-identical** MD5s for `index.js`, `wrangler.json`, `worker-entry-*.js` — eliminates build tool/bun version as suspect                                     |
| 2026-06-16 02:00 | Re-enabled CI auto-deploy for testing — same bug recurs immediately                                                                                                                                 |
| 2026-06-16 02:30 | Inspected deployed `dist/client/assets/index-AEO8XtPX.js` — **NO `*.supabase.co` URL strings present**, no `VITE_*` references, no `sb_publishable_*` key strings — proves Vite inlined `undefined` |
| 2026-06-16 03:00 | **Root cause identified**: `.env` is gitignored (`line 35-36`). CI clone has no `.env` → vite has no VITE*\* values → `import.meta.env.VITE*\*`becomes`undefined` in bundle                         |
| 2026-06-16 03:15 | Fix committed: `a9aa33fc` adds explicit `env:` block to workflow `Build` step with production VITE\_\* values from `wrangler.jsonc`                                                                 |
| 2026-06-16 03:30 | CI redeployed successfully. All 5 routes return 200. `/artikel` shows 12 real articles from Supabase. `/faq` shows 8 FAQ categories.                                                                |

## Root Cause

**Vite inlines `import.meta.env.VITE_*` into the client bundle at build time.** The values come from `process.env` at build time (or files matching `.env*` in the project root, loaded by Vite by default).

CI clones the repo. The `.env` file is **gitignored** (`.gitignore` line 35: `.env`, line 36: `.env.*`, line 37: `!.env.example`). So CI has no `.env`, no VITE*\* in `process.env`, and Vite silently replaces every `import.meta.env.VITE*\*`with`undefined` in the bundle.

The error is thrown by the BROWSER client code (`src/integrations/supabase/client.ts`) that ALSO runs in SSR. It checks `import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL` — both are `undefined` in CI builds, so the throw fires before any Supabase call.

**Smoking gun evidence** (from broken production worker at commit `8badc892`):

```bash
# Client bundle hash from broken deploy
curl -sS https://healthyu.web.id | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
# → /assets/index-AEO8XtPX.js

# Inspect for inlined VITE_* values
curl -sS https://healthyu.web.id/assets/index-AEO8XtPX.js -o /tmp/bundle.js
grep -aoE 'https://[a-z0-9.-]+\.supabase\.co' /tmp/bundle.js | sort -u
# → (empty — no URLs inlined!)

grep -aoE 'sb_publishable_[A-Za-z0-9_-]+' /tmp/bundle.js | sort -u
# → (empty — no keys inlined!)

# Inspect the broken createSupabaseClient function
grep -aoE 'var Rb=\{[^}]*\}' /tmp/bundle.js
# → var Rb={};   ← empty object, no env vars populated
```

The minified createSupabaseClient in the broken bundle:

```js
var Rb={};
function A$(){
  const t=Rb.SUPABASE_URL,         // undefined
        e=Rb.SUPABASE_PUBLISHABLE_KEY;  // undefined
  if(!t||!e){
    throw new Error("Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY...");
  }
  return createClient(String(t), String(e), {...});
}
```

## What Made This Hard to Diagnose

1. **`/api/debug/env` showed env was bound correctly** — strongly suggested the bug was at runtime, not build time
2. **Build artifacts were byte-identical** between VPS (bun 1.3.14) and CI (bun 1.1.34) — eliminated build tool as suspect
3. **VPS manual deploys always worked** — created false impression that the code was fine, leading to blame on CF Workers version transitions, wrangler version drift, or env propagation timing
4. **Multiple plausible hypotheses kept failing** — pinned wrangler version, switched from `wrangler-action` to direct CLI, added `--keep-vars`, added retry, bumped bun version. None worked because none addressed the actual bug
5. **False positive on `withEnvAsync` fix** (commit `401a11c6`) — addressed a real secondary bug (AsyncLocalStorage context loss across awaits in `envInjectionMiddleware`) but did NOT fix the 500s. This is a valid defensive fix that should stay, but it's not the root cause

## The Fix

**File: `.github/workflows/deploy.yml`** — add explicit `env:` block to `Build` step:

```yaml
- name: Build (Cloudflare Workers target)
  # Vite inlines VITE_* env vars into the client bundle at build time.
  # CI runs without the local .env file (gitignored for secrets safety),
  # so we MUST pass production VITE_* values explicitly here. Values are
  # public (already in wrangler.jsonc vars block which is committed) —
  # publishable keys + URLs designed to ship in the client bundle.
  # Source of truth: wrangler.jsonc vars.VITE_*.
  env:
    VITE_SUPABASE_URL: "https://<project-ref>.supabase.co"
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_..."
    VITE_SUPABASE_PROJECT_ID: "<project-ref>"
    VITE_SITE_URL: "https://<your-domain>"
  run: bun run build
```

**Source of truth for VITE\_\* values:** `wrangler.jsonc` `vars` block (already committed). Keep both in sync when rotating keys.

**Why hardcoding is safe:** The VITE\_\* values are public — publishable keys and URLs designed to ship in the client bundle. They are NOT secrets. The actual secrets (`SUPABASE_SERVICE_ROLE_KEY`, `VEXO_API_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`) are kept in `wrangler secret put` and never appear in the client bundle (verified by AUDIT-015).

## What Did NOT Fix This Bug (do not waste time)

These were all tried and ruled out:

1. ❌ Pin wrangler version (`wrangler@4.100.0` instead of `@latest`) — doesn't fix
2. ❌ Replace `cloudflare/wrangler-action@v3` with direct CLI — doesn't fix
3. ❌ Add `--keep-vars` flag — doesn't fix
4. ❌ Bun version bump (1.1.34 → 1.2.21, or 1.3.14) — doesn't fix
5. ❌ Add retry logic to deploy — doesn't fix
6. ❌ Real User-Agent in smoke test — cosmetic only
7. ❌ `withEnvAsync` / AsyncLocalStorage fix — DOES NOT fix this bug. It addresses a real secondary bug (AsyncLocalStorage context loss across await boundaries), but is NOT the cause of the /artikel 500s. The 500s come from `client.ts` (browser code that runs in SSR) where `import.meta.env.VITE_*` was inlined as `undefined` at build time.

## Verification

**Smoke test (CI workflow):** all 5 routes return 200 after fix:

- `/` → 200
- `/auth` → 200
- `/artikel` → 200 (12 articles loaded from Supabase)
- `/faq` → 200 (8 FAQ categories loaded from Supabase)
- `/api/health` → 200

**Bundle check (manual, after fix):**

```bash
# New bundle hash (vite regenerated with env vars)
curl -sS https://healthyu.web.id | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
# → /assets/index-CLuDyJ3-.js

curl -sS https://healthyu.web.id/assets/index-CLuDyJ3-.js -o /tmp/bundle.js
grep -aoE 'https://[a-z0-9.-]+\.supabase\.co' /tmp/bundle.js | sort -u
# → https://lezbpzpkvkdpbjvtvoei.supabase.co   ← FIXED

grep -aoE 'sb_publishable_[A-Za-z0-9_-]+' /tmp/bundle.js | sort -u
# → sb_publishable_66jMJijY4c8mdbHJxXaqnA_VzS7r-1D   ← FIXED
```

**HTML head check:** page now includes Supabase preconnect/dns-prefetch hints:

```html
<link rel="preconnect" href="https://lezbpzpkvkdpbjvtvoei.supabase.co" crossorigin="anonymous" />
<link rel="dns-prefetch" href="https://lezbpzpkvkdpbjvtvoei.supabase.co" />
```

## Lessons Learned

1. **`/api/debug/env` only checks RUNTIME env.** It does NOT detect build-time Vite substitution issues. Need a separate diagnostic: check the client bundle for inlined VITE\_\* values.
2. **`.env` gitignore is a structural decision that interacts with CI.** Any project that uses VITE\_\* env vars MUST pass them to `vite build` in CI workflows, since the local `.env` won't be cloned.
3. **"VPS works, CI doesn't" is a strong signal of build-time issue.** Runtime env (CF bindings) and build-time env (Vite substitution) are separate. The debug endpoint alone can't distinguish them.
4. **Vite is silent about missing env vars.** It inlines `undefined` without warning. There's no log line, no error, no build failure. The bundle just silently has empty values.
5. **Build artifacts can be byte-identical AND broken.** The `dist/server/` MD5s were identical between VPS and CI, but `dist/client/assets/index-*.js` was different (different content hash due to different inlined values). Always check both server and client bundles.
6. **Don't confuse "build artifacts match" with "build is correct".** A build can produce the same output and still be wrong if both runs are missing the same required input.
7. **The `withEnvAsync` fix is a real improvement that should stay** — it addresses a genuine AsyncLocalStorage bug that could manifest in other contexts. But it's not the fix for the /artikel 500s.

## Action Items

- [x] Add explicit `env:` block to workflow `Build` step (commit `a9aa33fc`)
- [x] Keep `withEnvAsync` fix as defensive measure (commit `401a11c6`)
- [x] Save diagnostic playbook to skill `devops/healthyu-ci-deploy-debug`
- [x] Save lesson to Hermes memory for cross-session recall
- [ ] **TODO:** Audit other projects / repos for same `.env` + `vite build` pattern
- [ ] **TODO:** Consider adding a CI step that greps `dist/client/assets/*.js` for known VITE\_\* values and fails if missing (catches regression automatically)

## Related

- **Skill:** `~/.hermes/skills/devops/healthyu-ci-deploy-debug/SKILL.md` — full diagnostic playbook
- **Commits:** `401a11c6` (withEnvAsync defensive fix), `a9aa33fc` (real fix)
- **Diagnostics endpoint:** `src/routes/api/debug/env.ts` — confirms runtime env (still useful for future env drift issues)
- **Source of truth:** `wrangler.jsonc` `vars` block
