# HealthyU — Architecture Mental Model

> Snapshot: 2026-06-14 (after d8b2879a deploy)

## TL;DR

TanStack Start v1 + Cloudflare Workers + Supabase (self-managed) + VexoAPI AI.
Custom server-entry workaround propagates CF env through AsyncLocalStorage
because the default entry doesn't forward it. Indonesian AI diet/wellness
app with offline-first, push notifications, cron hooks, ~30 feature modules,
74 SQL migrations, 336 unit tests passing.

## Stack

| Layer     | Tech                               | Notes                                                    |
| --------- | ---------------------------------- | -------------------------------------------------------- |
| Framework | TanStack Start 1.167 + React 19    | SSR via Nitro, CF Workers output                         |
| Routing   | TanStack Router 1.168              | File-based (`src/routes/`)                               |
| State     | TanStack Query 5.83                | staleTime 30s, gcTime 5m                                 |
| Styling   | Tailwind v4 + Radix UI + shadcn/ui | `cn()` helper, cva variants                              |
| Build     | Vite 7 + @cloudflare/vite-plugin   | Outputs to `dist/server/`                                |
| Deploy    | Cloudflare Workers                 | Custom `main: src/server-entry.ts`                       |
| Backend   | Supabase (self-managed)            | Project `lezbpzpkvkdpbjvtvoei`                           |
| AI        | VexoAPI (OpenAI-compat)            | gpt-oss-120b default, vision-capable models scarce       |
| Push      | Web Push (RFC 8291) + VAPID        | Self-implemented ECDH/HKDF/AES-128-GCM in push.server.ts |
| Cron      | pg_cron in Supabase                | Calls `/api/public/hooks/*` with `CRON_SECRET`           |
| Offline   | IndexedDB + offline-queue.ts       | 30+ features work offline                                |
| Tests     | Vitest 4 + jsdom + Playwright      | 336/336 passing, 46 files                                |
| Pkg mgr   | Bun 1.2+                           | `bun install`, `bun run test`, `bun run build`           |

## Directory Structure (top level)

```
src/
  server-entry.ts           # CF Worker entry — wraps default to pass env
  start.ts                  # createStart() + middleware chain
  router.tsx                # createRouter() + QueryClient config
  routeTree.gen.ts          # auto-generated (TanStack Router plugin)
  config/app.ts             # APP_CONFIG (siteUrl, name, supportEmail)
  components/
    ui/                     # shadcn primitives (45 files)
    healthyu/               # app-specific UI (35 files: calculator-shell, route-boundaries, etc)
    charts/                 # recharts wrappers
  features/                 # 30+ feature modules (see below)
  hooks/                    # 8 generic hooks
  integrations/
    supabase/               # client.ts, client.server.ts, auth-middleware.ts, types.ts (192KB)
  lib/                      # 35 shared utilities + 38 test files
  routes/
    _authenticated/         # 130 protected pages (dashboard shell)
    api/                    # 6 server endpoints
    api/public/hooks/       # 6 cron hooks (CRON_SECRET)
    *.tsx                   # 25+ public pages (kalkulator, kalori, dll)

supabase/migrations/         # 74 SQL files (RLS, tables, functions, types)
docs/                        # 5 markdown files (deploy, cron, supabase, vexo)
```

## Feature Modules (30+)

Most-used (in `src/features/`):

- **ai** — VexoAPI gateway, budget, cache, router, stream, Vexo adapter
- **scan** — barcode/photo meal scanner (49 lib files, the biggest module)
- **chat** — AI chat (chat.stream.ts endpoint, safety, context, stream)
- **calculators** — BMI, BMR, TDEE, body-fat, water, macro, heart-rate
- **fasting, water, sleep, mood, vitals, workout** — health tracking
- **mealplan, meals, recipes, food** — nutrition planning
- **notifications, reminders, prayer, qibla, fasting** — daily rituals
- **gamification, achievements, challenges, groups, pet** — engagement
- **mfa, roles, privacy, moderation, audit** — security/admin
- **export, reports, recommendations, referrals, subscription** — business
- **landing, onboarding, dashboard, profile, progress, coach** — UI flows
- **health-import, google-fit** — third-party integrations
- **articles, content, daily-tips** — SEO content

## Critical Infrastructure Files

### Env injection (CF Workers + TanStack Start)

```
src/server-entry.ts         # custom worker entry
src/start.ts                # envInjectionMiddleware (AsyncLocalStorage)
src/lib/cloudflare-env.server.ts  # getEnv() / withEnv() / getEnvVar()
src/lib/env.ts              # Zod-validated env schemas (clientEnv, serverEnv)
```

**Flow**: CF Worker → `entry.fetch(req, env, ctx)` → `inner.fetch(req, {context: env}, ctx)` → `createStartHandler` → `requestMiddleware[0] = envInjectionMiddleware` → `withEnv(env, next)` → `envStorage.run()` → all `getEnv()` calls in handlers receive the env.

**Triple lookup**: `getEnv()` merges AsyncLocalStorage + process.env (for local dev with .env + tests with vi.stubEnv).

### Supabase clients

| File                                       | Used by                      | Auth                                  | Storage      |
| ------------------------------------------ | ---------------------------- | ------------------------------------- | ------------ |
| `integrations/supabase/client.ts`          | Browser (auth-required)      | publishable key                       | localStorage |
| `integrations/supabase/client.server.ts`   | Server (admin, bypasses RLS) | service role key                      | none         |
| `integrations/supabase/auth-middleware.ts` | Server (per-request)         | user JWT from `Authorization: Bearer` | none         |
| `integrations/supabase/auth-attacher.ts`   | Browser (RPC attacher)       | attaches token to serverFn calls      | —            |

All clients are `Proxy` lazy-initialized on first prop access → no env validation at module load.

### AI gateway (VexoAPI)

```
src/features/ai/lib/
  aiGateway.server.ts       # callAiWithGuards / callAiJsonWithGuards / callAiJsonWithSchema
  vexoAdapter.ts            # callVexoApi + MODEL_TO_VEXO_MODEL + VISION_MODELS
  aiBudget.server.ts        # enforceAiBudget / logAiUsage (writes ai_usage_logs)
  aiCache.server.ts         # cacheKey / getCached / setCached
  aiRouter.server.ts        # model selection (chat, scan, coach)
  aiStreamGateway.server.ts # streaming variant
  ai-extras.functions.ts    # shared utilities
```

**3 public APIs** (consistent contract):

- `callAiWithGuards(opts)` → string
- `callAiJsonWithGuards(opts)` → T (parsed JSON, {} on failure)
- `callAiJsonWithSchema(opts)` → typed via Zod (with optional fallback)

**Vexo quirks** (per vexoAdapter.ts):

- New API: OpenAI-compatible POST `/api/v1/chat/completions` with Bearer auth
- Old API: GET `/api/{endpoint}?key=...` is DEPRECATED (returns 405)
- Free tier: no native JSON mode, no native vision
- 5xx/429 → exponential backoff (2 attempts, 200ms→800ms)
- Free-tier working models: `openai/gpt-oss-120b:free`, `llama-3.1-8b-instant`, `qwen/qwen3-32b`

### Push notifications

```
src/lib/push-config.ts                          # VAPID_PUBLIC_KEY (BEEW2-... — see Bugs)
src/components/push-notifications.tsx           # browser subscribe (applicationServerKey)
src/features/notifications/lib/push.server.ts   # server send (sendWebPushTo)
src/lib/__tests__/push-config.test.ts           # 65-byte P-256 point check
```

Self-implements RFC 8291: ECDH ephemeral keypair, HKDF, AES-128-GCM content encoding, VAPID JWT signed with private key.

### Cron hooks

```
src/lib/cronAuth.server.ts                      # requireCronSecret (timing-safe equal)
src/routes/api/public/hooks/
  daily-coach.ts            # AI coach push
  daily-content.ts          # daily tips push
  data-retention.ts         # GDPR-style cleanup
  notification-scheduler.ts # push scheduler
  recipes-trending-snapshot.ts
  weekly-ai-report.ts
```

**Auth**: `x-cron-secret` header OR `Authorization: Bearer <CRON_SECRET>`. Both accepted. `pg_cron` calls with one of these.

### SEO/Schema

```
src/lib/seo.ts             # SITE_URL = APP_CONFIG.siteUrl, canonical(), ogImage()
src/lib/schemaOrg.ts       # buildArticleSchema(), buildOrganizationSchema(), etc.
src/components/healthyu/calculator-shell.tsx  # breadcrumbSchema (uses APP_CONFIG.siteUrl)
src/routes/sitemap[.]xml.ts                   # 16 static + 6 dynamic URLs from Supabase
```

**APP_CONFIG.siteUrl** is the single source of truth. Reads `import.meta.env.VITE_SITE_URL` (build-time) with `||` fallback to `https://healthyu.web.id`.

## Data Model

74 migrations, ~30+ tables (see `supabase/migrations/` and `src/integrations/supabase/types.ts`):

**User**: profiles, user*stats, user_achievements, account_deletion_requests
**Nutrition**: food_items, food_serving_sizes, meal_logs, recipes, meal_plans
**Health**: fasting_sessions, water_logs, sleep_logs, mood_logs, vitals, weight_logs
**Activity**: workout_sessions, exercises, exercise_logs
**Wellness**: medications, medication_logs
**Social**: friend_groups, friend_group_members, community_posts, community_likes, community_comments
**Engagement**: achievements, challenges, challenges*_, challenges*users, groups
**AI**: ai_usage_logs, push_subscriptions, notification_preferences, notification_log
**System**: error_reports, audit_logs, recipes_trending, seo*_

**RLS**: All user tables have `auth.uid() = user_id` policies. Service role bypasses RLS for cron hooks.

## API Surface

### Public API (browser-facing)

- `GET /api/health` — liveness check (already in commit 90cff058)
- `GET /sitemap.xml` — sitemap with 16 static + dynamic URLs (commit d8b2879a)
- `POST /api/log-error` — client error reporting (uses service role)
- `POST /api/chat/stream` — AI chat streaming (Bearer auth)
- `GET /api/img/*` — image proxy
- `GET /api/wearable/google-fit/callback` — OAuth callback

### Cron hooks (CRON_SECRET auth)

- `POST /api/public/hooks/daily-coach`
- `POST /api/public/hooks/daily-content`
- `POST /api/public/hooks/data-retention`
- `POST /api/public/hooks/notification-scheduler`
- `POST /api/public/hooks/recipes-trending-snapshot`
- `POST /api/public/hooks/weekly-ai-report`

### Auth-protected (under `src/routes/_authenticated/`)

- dashboard, weight, insights, meal-detail, chat, articles, exercises, pet.shop, restaurants.nearby, stories

## Public routes (sitemap-relevant)

`/` (landing), `/kalkulator` (BMI/BMR/TDEE/body-fat/water/macro/heart-rate), `/kalori` (food), `/olahraga` (exercises), `/diet`, `/artikel`, `/resep`, `/faq`, `/cari` (search), `/auth`. Plus dynamic `${type}.${slug}` for each.

## Deploy Pipeline

1. `bun install` (813 packages, 16s)
2. `bunx tsc --noEmit` (0 errors, 0 issues)
3. `bun run test` (336/336, 46 files, ~50s)
4. `bun run build` (NODE_OPTIONS=--max-old-space-size=4096 vite build → dist/, 25-35s)
5. `wrangler deploy` (uploads 272 files, ~13s worker startup, 8.47 MiB / 1.67 MiB gzipped)

**CF Worker bindings** (after deploy):

- 6 secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VEXO_API_KEY, VEXO_BASE_URL, CRON_SECRET, VAPID_PRIVATE_KEY
- 6 vars (VITE\_\* and VAPID_SUBJECT): NODE_ENV, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID, VITE_SITE_URL, VAPID_SUBJECT

**Routes**: `healthyu.web.id/*` + `www.healthyu.web.id/*`

## Security/Privacy Patterns

- All AI calls gated by `enforceAiBudget(userId, isPremium)` → `ai_usage_logs` insert
- Rate limits via Supabase RPC `public.check_rate_limit(_bucket, _max_requests, _window_seconds)` — `RATE_LIMITS` const in `rateLimit.server.ts`
- Cron: `requireCronSecret` with timing-safe equal (prevents timing attacks)
- Auth: JWT via `supabase.auth.getClaims(token)` in middleware
- Image moderation: `src/features/moderation/lib/imageModeration.server.ts` checks uploaded images
- Sanitization: `rehype-sanitize` for markdown, no `dangerouslySetInnerHTML` for user/AI content without sanitizer
- Privacy flags respected: profile.privacy_settings used by social/group/challenge features
- Cron auth docs in `docs/cron.md`

## ⚠️ Known Issues (as of 2026-06-14)

### BUG: VAPID keypair mismatch breaks push notifications

3 different VAPID public keys in code/deploy:

- `src/lib/push-config.ts` VAPID_PUBLIC_KEY: `BEEW2-_Ozvcuye-VtIMl3ui-0HU5lCg_jAoFIPQEh33FaqKaPSkTfccTHIWpTA-AHqpLIc-VURMq_wVe4UlklV4` (used by browser + server)
- `wrangler.jsonc VITE_VAPID_PUBLIC_KEY`: `BEBt6arqeb3t7oiJknt4aGwvvLlvtnr4FSidJ-D2p5ouFsf4fIwWnhXJvoLtFxSqA5jw95HFrULDvIGLncoakk8` (matches CF secret VAPID_PRIVATE_KEY)
- `CF secret VAPID_PUBLIC_KEY`: `BEBt6a...` (matches wrangler.jsonc)

**Browser subscribes with `BEEW2-...` from push-config.ts** (compiled into JS bundle via `src/components/push-notifications.tsx:58`).

**Server signs JWT with private-for-`BEBt6a...`** (from CF env) but **sends `k=BEEW2-...` in Authorization header** (line 169 of push.server.ts).

**Result**: Push services verify JWT signature against the header public key → mismatch → push rejected with 401/403.

**Fix**: Update `push-config.ts` to `BEBt6a...` (same as wrangler.jsonc + CF secret).

### ✅ DEAD config cleaned up (2026-06-18)

Both the `VITE_VAPID_PUBLIC_KEY` in `wrangler.jsonc` (already removed in
`00c79e79`) and the related CF Worker secret `VAPID_PUBLIC_KEY` (never
read by code) have been addressed. The public key is hardcoded in
`src/lib/push-config.ts` and bundled into the client JS. The CF
secret was removed, the `VAPID_PUBLIC_KEY?:` type field in
`src/lib/cloudflare-env.server.ts` was removed, and the stale entry
in `wrangler-secrets.md` was cleaned up.

## Working Commits (most recent first)

```
d8b2879a fix(seo): use APP_CONFIG.siteUrl everywhere instead of hardcoded healthyu.id
6501c776 chore(vapid): rotate VAPID keypair
90cff058 chore(env): remove debug logs from health endpoint and env middleware
26256bc9 build(env): custom server-entry + envInjectionMiddleware to inject CF env into request context
4b65ee6b refactor(env): use AsyncLocalStorage pattern for CF Workers env access
826709c6 feat(workers): add www.healthyu.web.id route to wrangler.jsonc
```

## Test Coverage

- 46 test files, 336 tests, 100% pass rate
- Coverage areas: env, cloudflare-env, push-config, cronAuth, rateLimit, env validation, errorReporting, SEO, schemaOrg, AI budget/cache/gateway/router, chat safety, image moderation, mfa, oauthState, offline-queue, privacy, reminders, timelapse, qibla, calculators, confetti, browser, error-page, error-capture, health, health-endpoint, toast-config, i18n, imageModeration, localCalc, logger, schemaOrg, userDataTables, validation, utils
- e2e: Playwright config exists but `e2e/` directory mostly empty

## Definition of Done (from project rules)

1. Small, focused changes
2. No features removed without strong reason
3. TypeScript 0 errors (`bunx tsc --noEmit`)
4. Build doesn't break (`bun run build`)
5. Security/privacy not worsened
6. Files changed documented
7. Test approach documented
8. Wait for user approval before next phase

## Glossary

- **kalkulator** = calculator (BMI, BMR, TDEE, etc)
- **kalori** = calorie (food calorie lookup)
- **artikel** = article
- **resep** = recipe
- **faq** = FAQ
- **olahraga** = exercise
- **diet** = diet (Indonesian for diet, not English)
- **puasa** = fasting
- **doa** = prayer
- **WIB** = Waktu Indonesia Barat (UTC+7)
