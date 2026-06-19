# HealthyU

AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan HealthyU AI Coach.

> **2026-06-13 migration**: decoupled from Lovable AI platform. Now runs on
> self-managed Supabase, deploys to Cloudflare Pages, uses VexoAPI for AI.
> See [`.kilo/plans/lovable-migration.md`](./.kilo/plans/lovable-migration.md)
> for the full plan and per-phase commit history.

## Landing pages

Tiga versi landing page tersedia, masing-masing dengan karakter visual sendiri
dan menu pattern yang berbeda (mobile tidak menumpuk, desktop tidak kepotong):

| Route    | Karakter                                                                                         | Menu mobile                         | Menu desktop                   |
| -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------ |
| `/`      | Legacy marketing — glassmorphism, hero + bento + pricing                                         | Top sticky bar                      | Top sticky bar                 |
| `/flow`  | **Mobile-first.** Soft structuralism, white + emerald, generous whitespace, single column scroll | Bottom sheet nav (4 item + FAB CTA) | Top sticky bar                 |
| `/prism` | **Desktop-first.** Ethereal glass di warm cream + amber, left sidebar nav, asymmetric bento grid | Top sticky bar + drawer             | Left sidebar (fixed 256-288px) |

Semua halaman: SEO-friendly (canonical, OG tags, JSON-LD ready), accessibility
(WCAG AA contrast, focus rings, ARIA labels), responsive, dan punya CTA ke `/auth`.

### Visual rules yang dijaga di kedua design

- Zero em-dash (`—`) di semua copy visible
- 1 CTA per intent (no "Mulai gratis" + "Daftar" + "Coba sekarang" di tempat berbeda)
- Single accent color per halaman (emerald di Flow, amber di Prism)
- Statistik pake animasi count-up trigger via `IntersectionObserver` (cuma sekali per mount)
- Bentuk konsisten: `rounded-2xl` (card) / `rounded-full` (CTA pill) / `rounded-3xl` (panel besar)

Lihat design rationale di header comment `src/routes/flow.tsx` dan `src/routes/prism.tsx`.

## Fitur utama

- **Dashboard harian** — kalori budget, macro ring, hydration suggest, weekly goal, streak freeze.
- **Food log & scan** — manual log, AI scan dengan confidence badge & review-before-save, quick presets, frequent meals.
- **AI Coach** — chat streaming dengan safety guardrails (medical disclaimer, eating-disorder safe, prompt chips ID).
- **Progress** — weight trend, weekly sparkline, before/after frame, most-consistent-day badge, mood 7-day chart.
- **Onboarding** — goal + pace selector (gentle/steady/ambisius) dengan live kcal preview & floor 1200.
- **Wellness** — fasting timer, water, sleep, mood, vitals, medications, prayer times & qibla.
- **Sistem & UX** — command palette (⌘K), keyboard shortcuts (`?`), route progress bar, scroll-to-top, dark mode, PWA + push.
- **Privacy & PDP** — export data, request account deletion, sensitive notes (encrypted RPC), audit log.

## Stack

- **Frontend**: React 19, TanStack Start v1, TanStack Router, TanStack Query, Tailwind v4, shadcn/ui
- **Backend**: TanStack server functions (`createServerFn`) + server routes di `src/routes/api/`
- **Database & Auth**: Self-managed Supabase project (no longer Lovable Cloud) — RLS di semua tabel user
- **AI**: VexoAPI Gateway (gpt-oss-120b / glm-4.7-flash / multimodal gemini) lewat `src/features/ai/lib/aiGateway.server.ts`
- **Error reporting**: Custom logger ke `public.error_reports` table (Supabase) lewat `src/lib/errorReporting.ts`
- **Runtime**: Cloudflare Pages + Workers (Nitro preset)
- **Package manager**: Bun (single PM, lihat `engines` di `package.json`)

## Setup

```bash
bun install        # requires bun >=1.1.0 (packageManager: bun@1.2.21)
bun run dev        # http://localhost:8080
bun run build      # production build
bun run test       # vitest (271 tests, 70% coverage threshold)
bunx tsc --noEmit  # typecheck
```

## Environment variables

`.env` **tidak di-track di git**. Secrets at runtime are managed via:

- **Local dev**: `.env` file (copy from `.env.example`)
- **Production**: Cloudflare Pages → Settings → Environment variables

For local development:

```bash
cp .env.example .env
# Then fill the values. See docs/supabase-migration.md for sourcing each one.
```

| Var                                                 | Scope       | Sumber                                                          |
| --------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                                 | client      | Self-managed Supabase project → Settings → API                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                     | client      | Same (publishable/anon key)                                     |
| `VITE_SUPABASE_PROJECT_ID`                          | client      | Same                                                            |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`         | server      | Same                                                            |
| `SUPABASE_SERVICE_ROLE_KEY`                         | server only | Same (service_role key, NEVER expose to client)                 |
| `VEXO_API_KEY`                                      | server only | https://vexoapi.site (free tier, no login) — 16-char nanoid key |
| `VEXO_BASE_URL`                                     | server only | Default `https://vexoapi.site` — override for self-hosted proxy |
| `CRON_SECRET`                                       | server only | `openssl rand -hex 32` — min 32 chars, Cloudflare Pages env var |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`               | server only | Manual (web push)                                               |
| `GOOGLE_FIT_CLIENT_ID` / `GOOGLE_FIT_CLIENT_SECRET` | server only | Google Cloud Console                                            |

## Cron & webhook auth

Lihat [`docs/cron.md`](./docs/cron.md). Semua route di `src/routes/api/public/hooks/*`
memvalidasi `x-cron-secret` / `Authorization: Bearer <CRON_SECRET>` via
`requireCronSecret()` (`src/lib/cronAuth.server.ts`) — fail-closed kalau secret kosong.

## AI Gateway

Semua call AI lewat `src/features/ai/lib/aiGateway.server.ts` (VexoAPI-backed):

- `callAiWithGuards()` — per-user budget (hourly + daily token) + timeout 30s + usage logging.
- `callAiJsonWithSchema({ schema, fallback })` — JSON-mode via prompt hint + Zod validation + typed fallback.
- `failClosed: true` — untuk expensive ops (scan, weekly report), error budget/rate-limit = deny.
- `VEXO_API_KEY` hanya dibaca di helper, tidak boleh di callsite.

VexoAPI endpoint map (dari `src/features/ai/lib/vexoAdapter.ts`):

| Caller model                   | VexoAPI endpoint | Use case                     |
| ------------------------------ | ---------------- | ---------------------------- |
| `google/gemini-2.5-flash`      | `gptoss120b`     | default chat / scan text     |
| `google/gemini-2.5-flash-lite` | `glm47flash`     | cheap text                   |
| `google/gemini-2.5-pro`        | `gemini`         | multimodal (text + imageUrl) |

Rate limit:

- `src/lib/rateLimit.server.ts` — Supabase RPC-based sliding window, `failClosed` option.
- Chat: 30 msg/min. AI scan: 20/hour. Reports: 10/day.
- Scan callers (`scanCallAi.server.ts`) — rate limit + budget enforcement sebelum AI call.

Streaming pakai `src/features/ai/lib/aiStreamGateway.server.ts` (dipanggil dari `src/routes/api/chat.stream.ts`).
VexoAPI free tier tidak expose SSE, jadi kita buffer full response lalu emit sebagai
single SSE-shaped chunk (caller tetap bisa parse dengan `parseSseChunk`).
Chat stream melakukan sendiri: auth → rate limit → budget → safety guard → cache → AI call.

## Scripts

| Command                  | Fungsi                            |
| ------------------------ | --------------------------------- |
| `bun run dev`            | Vite dev server                   |
| `bun run build`          | Production build (Worker)         |
| `bun run test`           | Vitest unit tests                 |
| `bun run lint`           | ESLint full project               |
| `bun run lint:constants` | Lint hanya `src/lib/constants.ts` |
| `bun run e2e`            | Playwright smoke tests            |
| `bun run i18n:scan`      | Cek hardcoded strings untuk i18n  |
| `bunx tsc --noEmit`      | Typecheck                         |

## Deploy

Pipeline deploy hybrid (sejak token GH Secret stale 2026-06-18, CI gagal 4 deploy terakhir):

1. **Local** (sekarang jadi default): `bun run build` → `node scripts/postbuild-fix.mjs` → `node ./node_modules/.bin/wrangler deploy --keep-vars` (pakai `~/.config/healthyu/cf-token` di VPS).
2. **CI** (broken): Git push to `main` triggers Cloudflare Pages build via `.github/workflows/deploy.yml`. Butuh `CLOUDFLARE_API_TOKEN` secret yang valid di GH repo settings.

Postbuild fix script (`scripts/postbuild-fix.mjs`) membungkus `dist/server/index.js`
jadi `fetch(request, env, ctx)` handler yang forward CF Workers `env` bindings ke
TanStack Start request middleware chain via `requestOpts.context`. Tanpa ini,
`getEnv()` di route handlers return `undefined` (lihat header comment script
untuk konteks lengkap). Regex di-update 2026-06-19 supaya tolerate minified
symbol names (`ab` bukan cuma `a7`).

For first-time setup, see [`docs/cloudflare-deploy.md`](./docs/cloudflare-deploy.md).

- Production: `https://healthyu.id` (your custom domain)
- Preview: `https://<branch>.healthyu.pages.dev` (auto per branch)

## Production readiness

| Area           | Status | Detail                                                            |
| -------------- | ------ | ----------------------------------------------------------------- |
| Build          | ✅     | `bun run build` + `bunx tsc --noEmit` clean                       |
| Tests          | ✅     | 61 files, 529 tests, vitest 70% threshold                         |
| Lint           | ✅     | `bun run lint` clean (`.wrangler/` di-ignore sejak 2026-06-18)    |
| `.env` hygiene | ✅     | Not tracked in git, `.env.example` as template                    |
| Cron auth      | ✅     | `requireCronSecret()` — timing-safe, fail-closed                  |
| OAuth state    | ✅     | Crypto nonce, DB-persisted, single-use, 10 min TTL                |
| XSS prevention | ✅     | `rehype-sanitize` on all markdown, no `dangerouslySetInnerHTML`   |
| AI rate limit  | ✅     | Per-user budget + sliding-window rate limit on all AI calls       |
| AI fail-closed | ✅     | Expensive ops deny on infra error (budget/rate-limit RPC failure) |
| AI provider    | ✅     | VexoAPI (gpt-oss-120b / glm-4.7-flash / multimodal gemini)        |
| Error reporter | ✅     | Custom Supabase table logger (`public.error_reports`)             |
| PDP export     | ✅     | 91 tables mapped, 6 excluded with documented reasons              |
| RLS            | ✅     | Row-Level Security on all user tables                             |

## Known limits

- Cron job otentikasi via `CRON_SECRET` di Cloudflare Pages env — bukan publishable key (lihat `docs/cron.md`).
- Image processing pakai canvas API browser; tidak ada `sharp`/`canvas` di server (Worker constraint).
- Scan batch files (`src/features/scan/lib/scanBatch*.functions.ts`) — 36 files, barrel pattern. Functional but messy; refactor ditunda ke post-MVP.
- VexoAPI free tier dapat return 503 ("upstream denied") saat upstream model provider outage. Mitigasi: rotate key, atau swap ke `AI_FALLBACK_URL` (TODO).
- VexoAPI free tier tidak expose SSE — chat stream emits satu chunk, UI tidak dapat token-by-token animation. Acceptable trade-off.

## Security memory

Lihat `.lovable/security-memory.md` (managed by Lovable scanner).
