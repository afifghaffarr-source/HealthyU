# Roadmap 5-Fase Perbaikan — HealthyU

> **Snapshot:** 2026-06-15
> **Dasar:** Risk matrix (audit/02-risk-matrix.md) + 16 findings (audit/01-findings.md)
> **Prinsip:** Critical dulu, security dulu, satu PR = satu cluster (≤500 LOC diff per AGENTS.md rule)

---

## Fase 1 — Critical Stabilization (Sprint 1, ~3 hari) — ✅ **COMPLETE**

**Tujuan:** Stop the bleeding — fix bug runtime, type-safety bocor, lint gate.

**Status: DONE 2026-06-15.** Branch `fix/audit-fase-1-critical` pushed ke origin. 4 commit:

- `f14f49d3` fix(audit-001): restructure bottom-nav
- `752ff833` fix(audit-002): 13 empty catches
- `8f9bae4b` fix(audit-003): Restaurant type
- `04463609` fix(audit-011): prettier postbuild-fix

**PR:** https://github.com/afifghaffarr-source/HealthyU/pull/new/fix/audit-fase-1-critical

**Findings yang diperbaiki:**
| ID | Priority | Lokasi | Effort |
|---|---|---|---|
| AUDIT-001 | Critical | `src/components/bottom-nav.tsx:23-25` | S |
| AUDIT-002 | High | 9 file empty catches | S–M |
| AUDIT-003 | High | `src/routes/_authenticated/restaurants.nearby.tsx:14` | XS |
| AUDIT-011 | Low | `scripts/postbuild-fix.mjs:54` | XS |

**File yang disentuh:**

- `src/components/bottom-nav.tsx`
- `src/features/chat/hooks/useSpeech.ts` (+ logger/errorReporting wiring)
- `src/features/scan/lib/scanContent.functions.ts`
- `src/features/scan/lib/scanMeal.functions.ts`
- `src/features/scan/lib/scanMisc.functions.ts`
- `src/features/scan/lib/scanPlan.functions.ts`
- `src/routes/_authenticated/articles.$id.tsx`
- `src/routes/_authenticated/workout.player.$id.tsx`
- `src/routes/_authenticated/restaurants.nearby.tsx`
- `scripts/postbuild-fix.mjs`

**Risiko perubahan:** Medium untuk bottom-nav (navigation utama). Low untuk sisanya.

**Acceptance criteria:**

- [ ] `bunx tsc --noEmit` → 0 errors
- [ ] `bun run lint` → 0 errors (target 0, saat ini 18)
- [ ] `bun run test` → 336/336 (no regression)
- [ ] `bun run build` → 0 errors, postbuild-fix auto-applied
- [ ] Manual: navigasi di mobile + desktop tanpa crash, speech recognition error muncul di log

**Command testing:**

```bash
cd ~/projects/HealthyU
export PATH="/home/ubuntu/.bun/bin:$PATH"
bunx tsc --noEmit
bun run lint
bun run test
bun run build
```

**Manual QA:**

- Login sebagai user, navigasi ke `/dashboard`, `/chat`, `/scan.barcode`, `/reports`. Refresh di tiap route.
- Buka `/chat`, kirim pesan yang trigger speech recognition error (deny mic permission). Cek log.
- Buka route apapun, refresh cepat 3x. No console error.

**Rollback plan:** `git revert <sha>` (1 commit jika monorepo PR, atau revert batch commits). `wrangler rollback` jika sudah deployed.

**Prompt implementasi:** Lihat `audit/05-fix-prompts/01-fase-1-critical.md`

---

## Fase 2 — Security & Data Safety Hardening (Sprint 2, ~3 hari) — ✅ **COMPLETE**

**Tujuan:** Lock down convention, verify isolation, tambah monitoring.

**Status: DONE 2026-06-15.** Branch `fix/audit-fase-2-security` pushed ke origin. **PR #3 merged** (SHA `5e2ed50b`). 4 commit:

- `29aa5ecf` chore(audit-005): remove `continue-on-error: true` from CI lint step
- `260b699a` fix(audit-013): update vexoAdapter imports after rename to .server.ts
- `c42a06e8` refactor(audit-010): replace 11 console.\* in .server.ts with logger
- `5c54a99e` chore(audit-014): add eslint rule blocking _.server.ts import from _.tsx

**PR:** https://github.com/afifghaffarr-source/HealthyU/pull/3

Plus **API call (no commit)**:

- Branch protection set: 5 required status checks (`ci/check`, `ci/bundle-size`, `ci/secrets-scan`, `lint-constants/lint-constants`, `lint-constants/test`). `enforce_admins: false`.

**AUDIT-015 CRITICAL CHECK (verification only)**: ✅ **PASS** — no secrets in client bundle. `dist/client/` grep untuk `SUPABASE_SERVICE_ROLE`/`VEXO_API_KEY`/`VAPID_PRIVATE_KEY`/`CRON_SECRET`/etc. all 0 matches.

**Findings yang diperbaiki:**
| ID | Priority | Lokasi | Effort |
|---|---|---|---|
| AUDIT-005 | High | `.github/workflows/ci.yml` (verify lint gate) | S |
| AUDIT-009 | Medium | `dist/server/` (audit top-5 chunks, verify cloudflare-env isolation) | M |
| AUDIT-010 | Medium | 11 `console.log` di `.server.ts` → `logger.server.ts` | XS |
| AUDIT-013 | Improvement | `src/features/ai/lib/vexoAdapter.ts` → rename `.server.ts` | XS |
| AUDIT-014 | Improvement | Audit `*.functions.ts` import chain + tambah eslint rule | S |
| AUDIT-015 | Improvement | Verify `cloudflare-env.server` chunk tidak bocor ke client (CRITICAL CHECK) | M |

**File yang disentuh:**

- `.github/workflows/ci.yml` (verify)
- `eslint.config.js` (tambah rule enforce `.server.ts` di import)
- `src/lib/logger.server.ts` (tambah API: redaction)
- 11 file `*.server.ts` dengan console.log
- `src/features/ai/lib/vexoAdapter.ts` → rename `vexoAdapter.server.ts`
- `src/features/ai/lib/aiGateway.server.ts` (update import)
- `src/features/ai/lib/aiStreamGateway.server.ts` (update import)
- Audit + potential rename `*.functions.ts` → `*.server.ts` (jika ditemukan unsafe pattern)

**Risiko perubahan:** Medium (CI change bisa block PR). Low untuk rename.

**Acceptance criteria:**

- [ ] CI workflow baca `bun run lint` + `bunx tsc` + `bun run test` di matrix
- [ ] `git grep "console\." -- "src/**/*.server.ts"` → 0 matches
- [ ] `git grep "vexoAdapter" -- "src/**/!*.server.ts"` → 0 matches
- [ ] `git grep "SUPABASE_SERVICE_ROLE\|VEXO_API_KEY" -- "dist/client/**/*.js"` → 0 matches (**CRITICAL**)
- [ ] `bun run lint` → 0 errors, exit 0
- [ ] ESlint rule baru aktif (tolak import .server.ts dari .tsx)

**Command testing:**

```bash
cd ~/projects/HealthyU
export PATH="/home/ubuntu/.bun/bin:$PATH"
bun run lint
bun run build
# CRITICAL CHECK: verify no service role in client bundle
grep -r "SUPABASE_SERVICE_ROLE\|VEXO_API_KEY" dist/client/ 2>/dev/null | head -5
# Should be empty
```

**Manual QA:**

- Push PR dengan intentional console.log di .server.ts → CI harus fail
- Push PR dengan import .server.ts dari .tsx → CI harus fail
- (Manual post-deploy) Cek CF Workers logs di dashboard, tidak ada sensitive data

**Rollback plan:** Git revert. CF Workers previous deployment.

**Prompt implementasi:** Lihat `audit/05-fix-prompts/02-fase-2-security.md`

---

## Fase 3 — Core Quality & Bug Fixing (Sprint 3, ~4 hari)

**Tujuan:** Bundle optimization, type safety, fast refresh DX.

**Findings yang diperbaiki:**
| ID | Priority | Lokasi | Effort |
|---|---|---|---|
| AUDIT-004 | High | `dist/client/assets/index-*.js` (758KB) | M |
| AUDIT-006 | Medium | 18 file fast-refresh warnings | M |
| AUDIT-007 | Medium | `src/routes/_authenticated/articles.tsx:37-47` | XS |
| AUDIT-008 | Medium | 168 `as any` (prioritas 30 teratas) | L |

**File yang disentuh:**

- `src/routes/scan.barcode-camera.tsx` (lazy load)
- `src/routes/scan.barcode-live.tsx` (lazy load)
- `src/routes/_authenticated/reports.export.tsx` (dynamic import jspdf)
- `src/routes/_authenticated/reports.gallery.tsx` (dynamic import jspdf)
- 18 file fast-refresh (extract helper per case)
- `src/routes/_authenticated/articles.tsx`
- Top-30 `as any` per audit batch (prioritas: server fn + route auth)

**Risiko perubahan:** Medium-High (bundle changes, refactor).

**Acceptance criteria:**

- [ ] `dist/client/assets/index-*.js` < 500KB (target 400KB)
- [ ] `dist/client/assets/scan.barcode-*.js` not in initial chunk (only loaded on scan route)
- [ ] `bun run test` → 336/336 + 5+ new tests (type safety regression)
- [ ] `bun run lint` → 0 errors
- [ ] Edit file di dev mode → hot-reload works (cek 5 file sampled dari fast-refresh list)

**Command testing:**

```bash
cd ~/projects/HealthyU
export PATH="/home/ubuntu/.bun/bin:$PATH"
bun run test
bun run build
ls -la dist/client/assets/index-*.js
ls -la dist/client/assets/scan.barcode-*.js
# Dev mode: edit src/components/ui/button.tsx, save, check HMR
```

**Manual QA:**

- Dev mode: edit `src/components/ui/button.tsx`, save → HMR (no full reload)
- Production build: throttle ke 3G, cek first contentful paint di Lighthouse
- Buka `/scan.barcode-camera` → chunk loaded on-demand (DevTools Network)
- Buka `/reports.export` → jspdf chunk loaded on-demand

**Rollback plan:** Git revert per PR.

**Prompt implementasi:** Lihat `audit/05-fix-prompts/03-fase-3-quality.md`

---

## Fase 4 — UI/UX, Performance & Maintainability (Sprint 4-5, ~7 hari)

**Tujuan:** Long-term debt, accessibility, observability, dependency.

**Findings yang diperbaiki (planned):**
| ID | Priority | Lokasi | Effort |
|---|---|---|---|
| AUDIT-016 | Improvement | API route tests | S |
| AUDIT-012 | Low | chatSafety quarterly review | S |
| Top-3 god-file refactor | Improvement | types.ts, sidebar.tsx, scanMisc.functions.ts | L |
| (Planned) Dependency audit | Improvement | `bun outdated`, set Dependabot | S |
| (Planned) Lighthouse CI run | Improvement | `bunx lhci autorun` | S |
| (Planned) Playwright e2e | Improvement | `bunx playwright test` | M |
| (Planned) Code coverage | Improvement | `bunx vitest --coverage` | S |
| (Planned) A11y axe scan | Improvement | Playwright + axe-core | M |

**File yang disentuh:** Depends on actual findings dari Fase 3 evaluation.

**Risiko perubahan:** Variabel. Bisa Medium-High untuk refactor.

**Acceptance criteria:** TBD setelah Fase 3 complete.

**Prompt implementasi:** TBD.

---

## Fase 5 — Production Hardening (Ongoing)

**Tujuan:** Stabilitas operasional, monitoring, dokumentasi.

**Findings yang diperbaiki (planned):**

- Backup strategy untuk Supabase DB
- Rollback playbook untuk CF Workers deploy
- Monitoring/alerting (CF Workers analytics + custom)
- Documentation: troubleshooting, known issues
- Branch protection di GitHub
- Changelog/release notes
- E2E regression suite
- Security review quarterly (chatSafety keyword refresh, deps audit)

**Acceptance criteria:** TBD.

---

## Dependency antar Fase

```
Fase 1 (Critical) — bisa start sekarang, tidak ada dependency
Fase 2 (Security) — bisa start setelah Fase 1 complete
Fase 3 (Quality) — bisa start setelah Fase 2 complete
Fase 4 (UX/Perf) — bisa start setelah Fase 3 complete
Fase 5 (Hardening) — ongoing, tidak blocking
```

**Realistic timeline:** 5 sprint (10 minggu) untuk Phase 1-4. Phase 5 ongoing.

**Effort total (estimated):**

- Fase 1: ~3 hari (1 developer)
- Fase 2: ~3 hari
- Fase 3: ~4 hari
- Fase 4: ~7 hari
- Fase 5: ongoing

---

## Yang TIDAK Masuk Roadmap (Out of Scope)

- ❌ Rewrite total (melanggar AGENTS.md rule #1)
- ❌ Migrasi ke framework lain
- ❌ Fitur baru (selama ada critical bug)
- ❌ Visual redesign / brand refresh
- ❌ Major database refactor (selama RLS 100% coverage sudah cukup)

---

## Referensi Silang

- `audit/01-findings.md` — full 16 findings
- `audit/02-risk-matrix.md` — risk classification
- `audit/03-scores.md` — score per area
- `audit/05-fix-prompts/01-fase-1-critical.md` — Fase 1 implementation prompt
- `audit/05-fix-prompts/02-fase-2-security.md` — Fase 2 implementation prompt
- `audit/05-fix-prompts/03-fase-3-quality.md` — Fase 3 implementation prompt
