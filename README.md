# HealthyU

AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan Dr. Healthy.

## Stack

- **Frontend**: React 19, TanStack Start v1, TanStack Router, TanStack Query, Tailwind v4, shadcn/ui
- **Backend**: TanStack server functions (`createServerFn`) + server routes di `src/routes/api/`
- **Database & Auth**: Lovable Cloud (Supabase managed) — RLS di semua tabel user
- **AI**: Lovable AI Gateway (Gemini / GPT) lewat `src/lib/aiGateway.server.ts`
- **Runtime**: Cloudflare Workers (nodejs_compat)
- **Package manager**: Bun (single PM, lihat `engines` di `package.json`)

## Setup

```bash
bun install
bun run dev
```

## Environment variables

`.env` di-generate otomatis oleh Lovable Cloud. **Jangan edit manual.**

| Var | Scope | Sumber |
|---|---|---|
| `VITE_SUPABASE_URL` | client | auto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | auto |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | server | auto |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | auto |
| `LOVABLE_API_KEY` | server only | auto |
| `CRON_SECRET` | server only | **manual** (add via Cloud secret) |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | server only | manual (web push) |

## Cron & webhook auth

Lihat [`docs/cron.md`](./docs/cron.md). Semua route di `src/routes/api/public/hooks/*`
memvalidasi `x-cron-secret` / `Authorization: Bearer <CRON_SECRET>` via
`requireCronSecret()` (`src/lib/cronAuth.server.ts`) — fail-closed kalau secret kosong.

## AI Gateway

Semua call AI lewat `src/lib/aiGateway.server.ts`:
- `callAiWithGuards()` — rate limit + budget + cache + timeout.
- `callAiJsonWithSchema({ schema, fallback })` — JSON-mode + Zod validation + typed fallback.
- `LOVABLE_API_KEY` hanya dibaca di helper, tidak boleh di callsite.

Streaming pakai `src/lib/aiStreamGateway.server.ts` (dipanggil dari `src/routes/api/chat.stream.ts`).

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

## Known limits

- Cron job otentikasi via `CRON_SECRET` di Vault — bukan publishable key (lihat `docs/cron.md`).
- Image processing pakai canvas API browser; tidak ada `sharp`/`canvas` di server (Worker constraint).
- Refactor `src/features/*` & split route besar (`coach.tsx`, dll) ditunda — lihat `.lovable/plan.md`.

## Security memory

Lihat `.lovable/security-memory.md` (managed by Lovable scanner).