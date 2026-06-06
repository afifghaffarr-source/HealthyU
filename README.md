# HealthyU

AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan HealthyU AI Coach.

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
- **Database & Auth**: Lovable Cloud (Supabase managed) — RLS di semua tabel user
- **AI**: Lovable AI Gateway (Gemini) lewat `src/features/ai/lib/aiGateway.server.ts`
- **Runtime**: Cloudflare Workers (nodejs_compat)
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

`.env` **tidak di-track di git** (di-generate otomatis oleh Lovable Cloud saat deploy).
Untuk development lokal, copy `.env.example` → `.env` dan isi nilai yang sesuai.

```bash
cp .env.example .env
```

| Var | Scope | Sumber |
|---|---|---|
| `VITE_SUPABASE_URL` | client | auto (Lovable Cloud) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | auto (Lovable Cloud) |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | server | auto (Lovable Cloud) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | auto (Lovable Cloud) |
| `LOVABLE_API_KEY` | server only | auto (Lovable Cloud) |
| `CRON_SECRET` | server only | **manual** — min 32 chars, via Cloud secret (`openssl rand -hex 32`) |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | server only | manual (web push) |
| `GOOGLE_FIT_CLIENT_ID` / `GOOGLE_FIT_CLIENT_SECRET` | server only | manual (Google Cloud Console) |

## Cron & webhook auth

Lihat [`docs/cron.md`](./docs/cron.md). Semua route di `src/routes/api/public/hooks/*`
memvalidasi `x-cron-secret` / `Authorization: Bearer <CRON_SECRET>` via
`requireCronSecret()` (`src/lib/cronAuth.server.ts`) — fail-closed kalau secret kosong.

## AI Gateway

Semua call AI lewat `src/features/ai/lib/aiGateway.server.ts`:
- `callAiWithGuards()` — per-user budget (hourly + daily token) + timeout 30s + usage logging.
- `callAiJsonWithSchema({ schema, fallback })` — JSON-mode + Zod validation + typed fallback.
- `failClosed: true` — untuk expensive ops (scan, weekly report), error budget/rate-limit = deny.
- `LOVABLE_API_KEY` hanya dibaca di helper, tidak boleh di callsite.

Rate limit:
- `src/lib/rateLimit.server.ts` — Supabase RPC-based sliding window, `failClosed` option.
- Chat: 30 msg/min. AI scan: 20/hour. Reports: 10/day.
- Scan callers (`scanCallAi.server.ts`) — rate limit + budget enforcement sebelum AI call.

Streaming pakai `src/features/ai/lib/aiStreamGateway.server.ts` (dipanggil dari `src/routes/api/chat.stream.ts`).
Chat stream melakukan sendiri: auth → rate limit → budget → safety guard → cache → AI call.

## Scripts

| Command | Fungsi |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | Production build (Worker) |
| `bun run test` | Vitest unit tests |
| `bun run lint` | ESLint full project |
| `bun run lint:constants` | Lint hanya `src/lib/constants.ts` |
| `bun run e2e` | Playwright smoke tests |
| `bun run i18n:scan` | Cek hardcoded strings untuk i18n |
| `bunx tsc --noEmit` | Typecheck |

## Deploy

Lovable mengelola deploy otomatis. URL stabil:
- Production: `project--<id>.lovable.app`
- Preview: `project--<id>-dev.lovable.app`

## Production readiness

| Area | Status | Detail |
|---|---|---|
| Build | ✅ | `bun run build` + `bunx tsc --noEmit` clean |
| Tests | ✅ | 42 files, 271 tests, vitest 70% threshold |
| `.env` hygiene | ✅ | Not tracked in git, `.env.example` as template |
| Cron auth | ✅ | `requireCronSecret()` — timing-safe, fail-closed |
| OAuth state | ✅ | Crypto nonce, DB-persisted, single-use, 10 min TTL |
| XSS prevention | ✅ | `rehype-sanitize` on all markdown, no `dangerouslySetInnerHTML` |
| AI rate limit | ✅ | Per-user budget + sliding-window rate limit on all AI calls |
| AI fail-closed | ✅ | Expensive ops deny on infra error (budget/rate-limit RPC failure) |
| PDP export | ✅ | 91 tables mapped, 6 excluded with documented reasons |
| RLS | ✅ | Row-Level Security on all user tables |

## Known limits

- Cron job otentikasi via `CRON_SECRET` di Vault — bukan publishable key (lihat `docs/cron.md`).
- Image processing pakai canvas API browser; tidak ada `sharp`/`canvas` di server (Worker constraint).
- Scan batch files (`src/features/scan/lib/scanBatch*.functions.ts`) — 36 files, barrel pattern. Functional but messy; refactor ditunda ke post-MVP.

## Security memory

Lihat `.lovable/security-memory.md` (managed by Lovable scanner).