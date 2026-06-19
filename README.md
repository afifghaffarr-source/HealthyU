# HealthyU

AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan HealthyU AI Coach.

> **2026-06-13 migration**: decoupled from Lovable AI platform. Now runs on
> self-managed Supabase, deploys to Cloudflare Pages, uses VexoAPI for AI.
> See [`.kilo/plans/lovable-migration.md`](./.kilo/plans/lovable-migration.md)
> for the full plan and per-phase commit history.

## Landing pages

HealthyU punya **satu landing page primary** di `/` dengan mobile + desktop dua-duanya
ready (responsive). Mobile dapat bottom-sheet nav (4 item + FAB CTA, anti-numpuk di
viewport kecil), desktop dapat top sticky nav dengan menu lengkap. Section, hero,
CTA sama di kedua viewport — layout yang berbeda per breakpoint.

| Route    | Tipe                     | Keterangan                                                                                                                                                                                            |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`      | **Primary** (responsive) | Single canonical landing. Mobile: bottom-sheet nav + top bar drawer. Desktop: top sticky nav dengan Fitur/Cara kerja/Testimoni/FAQ + Masuk button. CTA ke `/auth` dari hero + sticky + final section. |
| `/prism` | Design experiment        | Desktop-first alternative layout (sidebar nav + asymmetric bento). Dipromosikan dari primary nav ke footer link. Keep untuk reference & A/B testing.                                                  |

### Visual rules yang dijaga

- Zero em-dash (`—`) di semua copy visible
- 1 CTA intent per section (no "Mulai gratis" + "Daftar" + "Coba sekarang" di tempat berbeda)
- Single accent color (`primary` = emerald) di seluruh landing
- Mobile bottom-sheet nav: 4 item (Scan, Resep, BMI, Coach) + center FAB "Mulai"
  untuk cegah nav menumpuk di mobile bottom strip
- Desktop nav: max 4 link + 1 CTA button dalam 80px height (no agency-portfolio navbars)
- Hero responsive: typography scale 40px mobile → 7xl desktop
- Stats counter pake animasi `IntersectionObserver` trigger (1x per mount)
- Bentuk konsisten: `rounded-2xl` (card) / `rounded-full` (CTA pill) / `rounded-3xl` (panel besar)

Component mobile-specific di `src/features/landing/components/MobileNav.tsx`:

- `<header>` top bar dengan logo + hamburger (lg:hidden)
- `<aside>` drawer overlay dengan section links + Mulai CTA
- `<nav>` bottom sheet dengan 4 item + FAB CTA (lg:hidden, fixed bottom-4)

Lihat design rationale di header comment `MobileNav.tsx`.

## PWA (Progressive Web App)

HealthyU installable sebagai aplikasi native di Android/iOS lewat home screen.
Service worker cache app shell + asset pihak ketiga untuk reliability di 3G/Ramadhan.

| Aspek            | Detail                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Plugin           | `vite-plugin-pwa@1.3.0` (manifest emission + virtual:pwa-register/react)                                    |
| Service Worker   | `src/sw.ts` (custom Workbox runtime), di-bundle via esbuild postbuild → `dist/client/sw.js` (24.9 kB)       |
| Manifest         | `/manifest.webmanifest` (645 B, generated dari VitePWA config di `vite.config.ts`)                          |
| Install prompt   | `src/components/install-prompt.tsx` — UX pakai `beforeinstallprompt` event                                  |
| Update prompt    | `src/components/sw-update-toast.tsx` — `useRegisterSW` dari `virtual:pwa-register/react`                    |
| Offline strategy | NetworkOnly untuk `/api/*` + `/auth/*` + mutations; CacheFirst untuk Google Fonts + Supabase Storage images |
| Precache         | Empty (workaround workbox-build ESM bug di bun 1.2.21). Browser HTTP cache handles app shell                |

### Kenapa `build:sw` script pisah?

`vite-plugin-pwa@1.3.0` punya 2 blocker di stack HealthyU (Vite 7 + TanStack Start + bun 1.2.21):

1. Internal `vite.build()` untuk SW silently no-op
2. `workbox-build` ESM/CJS interop bug dengan `brace-expansion@2.x`

**Solusi**: Tetap pakai VitePWA untuk manifest + virtual modules, tapi build `sw.js` terpisah via:

```json
"build": "... vite build && bun run build:sw",
"build:sw": "bunx esbuild src/sw.ts --bundle --format=iife --minify --target=es2020 --outfile=dist/client/sw.js"
```

Untuk fix permanen (pakai precache), migrate ke Node + npm saat workbox-build fix bug, atau upgrade ke workbox-build@8.

### Verifikasi production

```bash
curl -sI https://healthyu.web.id/manifest.webmanifest  # → 200, application/manifest+json
curl -sI https://healthyu.web.id/sw.js                  # → 200, text/javascript
# Lighthouse PWA category di CI workflow (.github/workflows/lighthouse.yml)
```

Lihat `docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md` (Sprint 1a) untuk research lengkap.

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
