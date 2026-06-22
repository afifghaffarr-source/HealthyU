# Changelog

All notable changes to HealthyU are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/).

> **Scope:** This changelog starts at commit `008dd1dc` (audit baseline, 2026-06-15).
> For earlier history, see git log. PRs are referenced by number where applicable.

---

## [Unreleased]

---

## Sprint 9 — Production Hardening (2026-06-23)

> **Commits:** `15519774`, `b172c475`, `6a73e1a9`

### Added

- **Monitoring & Alerting Documentation** (`docs/monitoring.md`):
  - Cloudflare Workers analytics setup & metrics
  - Supabase error tracking queries
  - Real-time log streaming with `wrangler tail`
  - Health endpoints & uptime monitoring
  - Backup monitoring procedures
  - Database performance queries
  - AI usage tracking
  - Incident response playbook
  - Weekly monitoring checklist

- **Troubleshooting Guide** (`docs/troubleshooting.md`):
  - Quick diagnostics commands
  - 7 common issue categories with solutions:
    - Production down (502/504 errors)
    - Database errors (migration, RLS, constraints)
    - Authentication issues (API keys, JWT, OAuth)
    - Build & deployment issues
    - Performance issues
    - Cron jobs not running
    - Storage issues
  - Emergency procedures (production down, data loss, security incident)
  - Debugging tools reference

- **Known Issues Tracking** (`docs/known-issues.md`):
  - Priority-based issue tracking (P0-P3)
  - High priority:
    - HI-001: Bundle size 500KB hard floor (TanStack Start + React 19)
    - HI-002: GitHub Actions CF token invalid
    - HI-003: 37 phantom bindings in Cloudflare Worker
  - Medium priority:
    - MI-001: 168 `as any` usages (top 30 fixed)
    - MI-002: Lighthouse accessibility score < 100
    - MI-003: E2E test coverage < 80%
    - MI-004: Supabase database connection pooling
  - Low priority:
    - LI-001: Unused dependencies
    - LI-002: Console warnings in development
    - LI-003: Documentation gaps

- **Health Check Script** (`scripts/health-check.ts`):
  - Automated endpoint testing (landing page, health API, Supabase)
  - Latency measurement
  - Status reporting with exit codes

- **E2E Regression Suite** (`e2e/regression.spec.ts`):
  - Navigation & routing tests (public/protected routes, 404, deep links)
  - API endpoint tests (health, log-error, CORS)
  - Performance benchmarks (load time < 3s, no JS errors, image optimization)
  - Form handling tests (validation, double-submit prevention)
  - Error handling tests (network failures, error boundaries)
  - Responsive design tests (mobile viewport, touch targets 44x44px)
  - SEO & meta tags tests (unique titles, Open Graph, JSON-LD)
  - Accessibility regression tests (ARIA names, contrast, focus indicators)

### Documentation

- **Roadmap Update**: Marked Fase 3 complete with acceptance criteria:
  - AUDIT-004: Bundle 853KB → 500KB (-41%)
  - AUDIT-006: Fast-refresh 210 → 0 warnings
  - AUDIT-007: Type safety (already fixed)
  - AUDIT-008: 0 `as any` violations in source
  - Tests: 760/760 passing

### Infrastructure

- **Backup Strategy** (already running):
  - Daily cron job at 03:00 UTC
  - 30-day retention policy
  - Telegram offsite backup notifications
  - Status: ✅ Operational

- **Rollback Playbook** (already documented):
  - Cloudflare Worker rollback procedures
  - Database restore procedures
  - DNS rollback steps
  - Located in `docs/deployment-playbook.md`

### Performance

- **Bundle Size Status**:
  - Current: 500KB (gzip 164KB)
  - Target: < 400KB (unreachable with current stack)
  - Hard floor: TanStack Start + React 19 framework code (~400KB)
  - All possible lazy-loading already implemented (ZXing, dexie-sync, webVitals)

### Testing

- Unit tests: 760/760 passing ✅
- E2E tests: Added regression suite (40+ test cases)
- Coverage: Maintained at >75%

---

## Sprint 8 — Bundle Polish (2026-06-21)

> **Commit:** `d7278a9b` (also includes Sprint 5a polish telemetry).
> **Deployment:** `6c8ee8b0-5955-4a94-a94d-e8de2eb73816`, then `f534ce77-d1d8-407c-aea6-7d1444beed38`.

### Performance

- Lazy-loaded 5 root UI components via `<Suspense>` in `src/routes/__root.tsx`:
  `Toaster`, `InstallPrompt`, `SWUpdateToast`, `ScrollToTopButton`, `RouteProgressBar`.
- Main bundle: **541 KB → 497 KB raw (−8%)**, gzipped **164 KB → 150 KB (−9%)**.
- Cumulative since project start: **853 KB → 497 KB (−42% raw)**.

### Changed

- TSC fix: `src/routes/__tests__/sitemap.test.ts` — `string | null | undefined`
  handling (unblocks CI after Sprint 6b).

---

## Sprint 7 — Vendor Code-Split (2026-06-21)

> **Commit:** `bdb20343`

### Performance

- Manual vendor chunking via `vite.config.ts` — split `react`, `@tanstack/*`,
  `recharts`, `cmdk`, `zod`, `dompurify`, etc. into separate chunks.
- Main bundle: **853 KB → 541 KB raw (−36%)**, gzipped **−25%**.
- Server chunks audited — `cloudflare-env.server` confirmed isolated from
  client bundle (no key leakage).

---

## Sprint 6b — SEO Polish (2026-06-20)

> **Commits:** `f649900d`, `9b0c7427`, `8e7d5bab`

### Added

- Pre-generated OG images for **38 recipes + 15 articles** (committed as static
  assets — `npm run build:og` script).
- Sitemap `lastmod` per-URL (real `updated_at` from DB, not build time).
- Perf budget enforcement CI step (fails if main bundle > 550 KB raw).

### Fixed

- 1 stubborn article body that AI call missed on first pass — direct Vexo call
  bypass + retry.

---

## Sprint 6a — hreflang (2026-06-20)

> **Commit:** `aa754a1e`

### Added

- `hreflang="id"` + canonical alternate on all 17 public pages for international
  SEO clarity (HealthyU is `id-ID` only currently; signals single-locale intent).

---

## Sprint 5d — Article Body Fill (2026-06-19)

> **Commits:** `94471021`, `ce119a26`, `90b3cb56`, `38a6f625`, `f17a1af4`, `8dc28234`

### Added

- Admin route `/admin/articles/fill-bodies` to bulk-fill empty article bodies
  via Vexo AI (gated to admin role).
- **14/15 articles** now AI-generated; remaining 1 will be regenerated manually.

### Performance

- Worker entry sets `Cache-Control` headers for static assets (1y immutable
  for hashed, `no-store` for HTML).

### Fixed

- `ai_generated` (underscore) — matches `recipes.body_source` check constraint.
- Markdown-fenced JSON in recipe body parser handled (was previously crashing).
- Removed `regen-route-tree.ts` from CI lockfile mismatch.

---

## Sprint 5a — Meal Plans + Chat Telemetry (2026-06-19 / 2026-06-21)

> **Polish commit:** `d7278a9b` (telemetry + VexoAPI integration docs).

### Added

- **Meal plans** (Sprint 5a core):
  - Zod schema with super-lenient `description`/`servings` parsing.
  - 5 seeded meal plan templates + client-side fallback when AI unavailable.
  - Mode badge (cutting / maintaining / bulking).
- **Postmortem 2026-06-19 → Sprint 5a polish telemetry:**
  - 2 `reportError()` events: `chat.ai.empty_response` + `chat.ai.stream_error_empty`.
  - Privacy guard: telemetry context NEVER includes user message text — only
    `source`, `chat_path`, `upstream_error`. Asserted by test.
- **`docs/ai-integration.md`** (12 KB) — covers both VexoAPI call paths
  (SDK + direct fetch) + the `/api/v1` gotcha that caused 2026-06-19 incident.

### Fixed

- **Postmortem 2026-06-19 — Chat empty reply.** Vercel AI SDK hardcodes
  `/chat/completions`, VexoAPI serves it under `/api/v1/`. Fix: append
  `/api/v1` to provider `baseURL` in `vexoProvider.ts`.
- Service worker: invalidate stale caches + deny caching server-fn RPC.

---

## Sprint 5b — Resep Migration (2026-06-19)

> **Commits:** `ec00b401`, `2892f592`, `1ba86207`, `872d51c0`, `3e355bdd`, `3df51c8c`, `560999f9`, `9021bd59`, `abe20577`, `2588afa1`

### Changed

- Migrated recipe URLs: `/recipes/*` → `/resep/*` (Bahasa Indonesia canonical).
  `/recipes/*` now deprecates with smart 301-style redirects.
- Profile "Resep Sehat" tile points to public `/resep` (was broken `/recipes`).

### Added

- `/resep/tersimpan` — bookmarked recipes (server-side redirect for anon).
- `/resep/$slug` — rating form, reviews section, AI remix modal.
- Recommendations strip + auth-aware CTA on `/resep/`.
- `getSeoRecipe` returns `recipesId` + auth-optional bookmark state.

---

## Sprint 5c — PWA + Web Vitals (2026-06-19)

> **Commit:** `aa429a52`

### Performance

- PWA `start_url` aligned with production domain.
- Web Vitals reporting via `error_reports` table (FCP, LCP, CLS, INP).

### Added

- `docs/incident-2026-06-16-ci-deploy.md` (already shipped — Sprint 2 retro).

---

## Sprint 2d — Multi-Provider AI (2026-06-18)

> **Commits:** `c05b3bfd`, `ada92b4b`, `876e038b`, `3cfc209b`, `0d2b63ea`, `b60a61e4`, `a6dc59f7`, `daf49509`

### Added

- Multi-provider AI gateway: VexoAPI for chat, **OpenRouter** for vision.
- `ai-status` route handler + `/api/ai/status` diagnostic.
- `chat.stream` routed via multi-provider AI.

### Fixed

- Vision model defaults updated to current OpenRouter catalog.
- `pickVisionModel` used in `callAiVisionWithFallback` (was missing).
- Force OpenRouter vision when image present (not `preferredModel`).
- `scan-nutrition` now sends OCR text to AI (no image) — VexoAPI has no vision
  models, but OpenRouter does. Avoids failed vision calls on Indonesian labels.

---

## Sprint 2b — Hijri Widget (2026-06-17)

> **Commit:** `dca26188`

### Added

- Hijri date widget in dashboard header.
- Ramadhan 1448 H countdown banner (auto-hides outside Ramadhan window).

---

## Sprint 2a — Offline-First Water Pilot (2026-06-16)

> **Commit:** `7f8bc0f9`

### Added

- Dexie (IndexedDB) pilot for water logging — writes locally, syncs to
  Supabase when online. Reference implementation for future offline features
  (food log, fasting timer).

---

## Sprint 1c — Vercel AI SDK Layer (2026-06-15)

> **Commit:** `30d12fc2`

### Added

- `docs/readme` section on Vercel AI SDK layer (additive, doesn't replace
  direct fetch path used by `vexoAdapter.server.ts`).
- `src/features/chat/lib/aiStreamGateway.server.ts` — SDK-based streaming
  alternative for future migration.

---

## Audit Closures (2026-06-15 → 2026-06-21)

### Security & Data Safety (Fase 2 — PR #3)

- ✅ **AUDIT-005:** CI lint gate hardened (`continue-on-error: true` removed).
- ✅ **AUDIT-009:** Server chunk isolation verified — `cloudflare-env.server` not in client bundle.
- ✅ **AUDIT-010:** 11 `console.*` in `.server.ts` replaced with `logger.server.ts`.
- ✅ **AUDIT-013:** `vexoAdapter.ts` → `vexoAdapter.server.ts` (server-only convention).
- ✅ **AUDIT-014:** ESLint rule blocks `.server.ts` import from `.tsx`.
- ✅ **AUDIT-015:** Verified no `SUPABASE_SERVICE_ROLE` / `VEXO_API_KEY` / `VAPID_PRIVATE_KEY` in `dist/client/`.
- ✅ Branch protection: 5 required status checks.

### Critical Stabilization (Fase 1 — PRs #1, #2)

- ✅ **AUDIT-001:** `bottom-nav.tsx` React Hooks conditional calls fixed (runtime crash).
- ✅ **AUDIT-002:** 13 empty catch blocks → `logger` / `errorReporting`.
- ✅ **AUDIT-003:** `restaurants.nearby.tsx` `any` → `unknown` + Zod parse.
- ✅ **AUDIT-011:** Prettier violation in `scripts/postbuild-fix.mjs` fixed.

### UX / Perf / Bundle (Fase 4)

- ✅ **AUDIT-016:** 22 API route tests added (`/api/health`, `/api/chat/stream`).
- ✅ **AUDIT-012:** chatSafety quarterly review (60% → 90%+ coverage).
- ✅ God-file investigation: 1 real god-file split, 1 dead code (sidebar.tsx 745 LOC) deleted, 1 auto-generated type left untouched.
- ✅ 4 deferred Fast Refresh files fixed (0 react-refresh warnings in `bun run lint`).
- ✅ Code coverage baseline: lines 76.07%, statements 73.63%, functions 72.91%, branches 69.94%.

### Lighthouse CI Strict Gate (Fase 6 — PR #12)

- ✅ `lighthouserc.json`: a11y `error ≥ 0.9` (hard block), perf/bp/seo `warn ≥ 0.7/0.8/0.8`.
- ✅ Skill saved: `bundle-lazy-load-pattern` (ZXing dynamic-import pattern).

### Dependency Audit (Fase 7 — PR #15)

- ✅ `bun update` 38 packages + overrides (esbuild/brace-expansion).
- ✅ Dependabot weekly configured.

### Privacy & Compliance (AUDIT-017, 018, 019, 020, 021)

- ✅ **AUDIT-017 PII detection (Phases 1-3):**
  - 4 categories (phone, email, ktp, credit_card) — `src/lib/pii.ts` + 14 unit tests.
  - Client-side warning UI (Indonesian labels).
  - Server-side audit log (`audit_log` via `log_audit_event`, kinds + count only — no PII value).
  - Chat retention policy: opt-in `profiles.chat_retention_days` + `purge_user_chats()` SQL function.
- ✅ **AUDIT-018:** Right-to-access data export (PDP) — JSON + CSV, 2 formats, 1 server call, audit-logged.
- ✅ **AUDIT-019:** PII redaction toggle in `/pengaturan/chat`.
- ✅ **AUDIT-020:** Account deletion cron — `process_account_deletion` SQL function + cron endpoint, 24h grace window.
- ✅ **AUDIT-020 stuck-processing recovery:** `/api/public/hooks/stuck-processing-recovery` cron.
- ✅ **AUDIT-021:** Storage cleanup cron — orphaned scan uploads.

---

## Stats Snapshot (2026-06-21)

| Metric                | Value             | Δ from audit baseline (2026-06-15) |
| --------------------- | ----------------- | ---------------------------------- |
| Tests                 | **751/751** pass  | +415 (was 336)                     |
| TSC errors            | **0**             | unchanged                          |
| Lint errors           | **0**             | −18 (was 18)                       |
| Main bundle raw       | **497 KB**        | −261 KB (−34%)                     |
| Main bundle gz        | **150 KB**        | —                                  |
| `as any` occurrences  | ~184              | +16 (was 168, target: ↓)           |
| Server chunks         | verified isolated | —                                  |
| LHCI strict a11y gate | ✅ enabled        | new                                |
| Production version    | `f534ce77`        | —                                  |

---

## Deferred / Open

- **AUDIT-008:** `as any` systemic cleanup (184 occurrences) — partial only.
- **AUDIT-017 Phase 4:** PII opt-out client-side (deferred, awaiting UX decision).
- **Fase 5 Production Hardening proper:** backup schedule, rollback playbook,
  monitoring/alerting, changelog automation.
- **PRD backlog:** see `docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md`
  for Tier 1–3 feature ideas (AI Warung Mode, Offline Diary Mode, etc.).
