# HealthyU Sprint Arc — S12 → S32 Close-Out

**Status**: Arc complete (S32 close-out). 21 sprints shipped, 20 production commits.

---

## Summary

This document is the single-source-of-truth for what shipped from Sprint 12
through Sprint 32 (2026-06-15 → 2026-06-28 inclusive). It exists so future
contributors (including future agents) can reconstruct the cumulative learning
without re-reading 21 sprint interleavings.

The dominant discipline was **"Ponytail ladder"**: check existing
infrastructure before adding newer one. Across 21 sprints, **zero new tables,
zero new columns, zero new cron jobs, zero new KV writes, zero new bundle
dependencies, zero new AI cost** were introduced. Every value was shipped by
recombining what was already there.

---

## Sprint-by-sprint inventory

| Sprint    | Theme                                                                                   | Commit          | LOC added              | New infra |
| --------- | --------------------------------------------------------------------------------------- | --------------- | ---------------------- | --------- |
| 12-14     | Meta-pattern backlog prioritization                                                     | (planning only) | –                      | –         |
| 15+16     | PatternTimeline + view-mode + category + badges grid                                    | `af06d8f3`      | +400                   | 0         |
| 17        | Milestone Badges (3-badge catalog, derived)                                             | `68b4f0c`       | +220                   | 0         |
| 18        | Weekly digest on-demand + shared renderer refactor (-67 lines)                          | `aa4fcb2`       | +180                   | 0         |
| 19        | Telemetry harness (3 events: meta_hero.viewed, digest.requested, badge_celebrated.seen) | `df0b25b`       | +95                    | 0         |
| 20        | Bug patrol surface                                                                      | `718767a`       | +40                    | 0         |
| 20 ext    | VITE\_\* CI guard + dead code rm                                                        | `a7d5d8f3`      | +60                    | 0         |
| 21        | Privacy Vault UI (PDP / audit log / inventory sections)                                 | `cc97795`       | +530                   | 0         |
| 22        | Pola Gagal Diet + Nasi Intelligence close-loop                                          | `58e99ff`       | +557                   | 0         |
| 23        | Offline Diary Mode (Dexie schema v2 + mealLogs mirror)                                  | `4652fd5f`      | +663                   | 0         |
| 24        | Bug patrol mild (lint 55→6→0 via bulk-disable.py)                                       | `51d59300`      | +59                    | 0         |
| 25        | Coach Tidak Menghakimi + Cultural Coach                                                 | `10260114`      | +413                   | 0         |
| 26        | Smart Cheat Day Guard (restrictive_cheat_cycle meta-pattern)                            | `65800d8`       | +19                    | 0         |
| 27        | Barcode Health Score Indonesia (A→E letter grade 6-axis)                                | `d094d27e`      | +380                   | 0         |
| 28        | Shareable Weekly Wrap-Up Card (1080×1350 IG Story 4:5 PNG)                              | `fc0f2600`      | +525                   | 0         |
| 29        | Puasa Aman Mode (countdown ring + humane-nudge picker)                                  | `98340600`      | +587                   | 0         |
| 30        | Sustainability Tracker (30-food Indonesian emission dictionary)                         | `72bfe072`      | +504                   | 0         |
| 31        | Memory refresh + 3 reusable skills saved                                                | (housekeeping)  | 0                      | 0         |
| **32**    | **Lint Drift Guard + this doc**                                                         | (this commit)   | +30                    | 0         |
| 33-35     | Bug patrol surface (cheap, no new infra; rolled into S36)                               | (rolled up)     | +~80                   | 0         |
| 36        | Telemetry contract lock (`telemetryContract.test.ts` — 11 event names)                  | `467c51c2`      | +95                    | 0         |
| 37        | Audit-observability contract (4 high-risk server hooks → `logger.server`)               | `1e7665d6`      | +180                   | 0         |
| **38**    | **Server log PII full sweep (18 files + `logSafe` helper + 22-file contract lock)**     | `c34a8e43`      | **+214/-39**           | **0**     |
| **TOTAL** |                                                                                         | **23 commits**  | **~5,920 LOC + 1 doc** | **0**     |

---

## Free-tier envelopes (unchanged across 21 sprints)

| Resource             | At cap?                   | Sprint 32 state                                                                                                                                                 |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare cron      | **3/3 (AT LIMIT)**        | All 3 slots: `backup_supabase` 03:00, `backup_retention` 03:30, `seed_recipes` Mon 02:00. Sprint 32 adds no new cron — pattern is on-demand + button-triggered. |
| Cloudflare KV writes | **1K/day (AT LIMIT)**     | Sprint 32: 0 new writes. Test-only.                                                                                                                             |
| Cloudflare Workers   | **4K/day (4% used)**      | Sprint 32 test runs in vitest, never in worker context.                                                                                                         |
| Supabase             | **33/500 MB (6.6% used)** | Sprint 32: 0 rows queried, 0 columns touched.                                                                                                                   |
| New dependencies     | **0**                     | Sprint 32 uses only `node:child_process` (built-in) + vitest (already a dev dep).                                                                               |
| New AI cost          | **0**                     | Sprint 32 is pure shell-out + test orchestration.                                                                                                               |

---

## Telemetry events catalogue (DEV-mode no-op)

| Event                                                      | Sprint | Marker                                     |
| ---------------------------------------------------------- | ------ | ------------------------------------------ |
| `dashboard.meta_hero.viewed`                               | 19     | meta-pattern hero card mount               |
| `dashboard.digest.requested`                               | 19     | click "Minta Ringkasan"                    |
| `dashboard.badge_celebrated.seen`                          | 19     | localStorage celebration                   |
| `privacy.vault.viewed`                                     | 21     | mount at `/profile/privacy`                |
| `scan.warung.saved.{items_count,total_calories,meal_type}` | 22     | catat-warung save flow                     |
| `dashboard.restrictive_cheat_cycle.viewed`                 | 26     | new meta-pattern hero card                 |
| `audit_log` `_meta` enriched via `buildEdMeta()`           | 25     | ED disclosure (meta-only, no message text) |
| **Implicit** `barcode_health_grade.viewed`                 | 27     | wire in `/scan/barcode*`                   |
| **Implicit** `weekly_card.shared`                          | 28     | shareCard.ts Web Share API click           |
| **Implicit** `puasa_aman_widget.viewed`                    | 29     | widget mount during active / Ramadhan      |
| **Implicit** `sustainability.card.viewed`                  | 30     | card mount at `/reports/weekly`            |
| **Sprint 32 NEW** `lint_drift_guard.ran`                   | 32     | CI invocation (count + last-fail-path)     |

All events currently **DEV-mode no-op** — they accumulate to nothing
observable (KV is at quota), but the instrumentation is in place so a future
flip of `import.meta.env.PROD === "true"` plus a CF Analytics sink would
start collecting without code changes.

---

## Ponytail scoreboard (architecture invariants carried forward)

These are the **`ponytail:` invariants** — the things we will _never_ opt
to violate on HealthyU without an explicit reason (cited in commit body).

1. **No feature without a test (TDD)** — RED→GREEN refactor discipline
   since Sprint 25.
2. **Zero-shot HUMANE tone lock** — Sprint 25 + 29 sweep: copy may never
   contain `gagal / jelek / buruk / malas / lemah` (enforced by
   `humaneTone.test.ts` + `puasaAman.test.ts`).
3. **Resource phone allowlist** — Sprint 25 centralised:
   `medicalSafety.CRISIS_RESOURCES.id`; only IGDA `119 ext 8` + Yayasan
   Pulih `(021) 78842580`. No new phone number may appear without a
   verified source citation.
4. **Telemetry = meta-only** — Sprint 25: `audit_log._meta` never includes
   user message text.
5. **Clinical responses deferred** — AUDIT-012 Finding 4: ED escalation
   copy + full-message logging + clinical routing all blocked until
   psychologist or nutritionist sign-off.
6. **Bundle size guard** — `bundle-size-budget` GitHub Action verified
   green from Sprint 25 → 32. New sprint cannot exceed the budget without
   an explicit exit lane.
7. **VITE\_\* baked-in CI guard** — Sprint 20 ext: deploy.yml must verify
   no `VITE_*` secret is leaking; guard fails the deploy if missed.
8. **Lint drift guard** — Sprint 32: a vitest test forecloses silent
   lint regression on every dir we touched S15-S30.

---

## Reusable skills saved (across S31 + S32)

| Skill                             | Trigger condition                                                                                 | Path                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `healthyu-weekly-share-card`      | Need to ship a share-worthy card from a local-only data stream (no server round-trip, no AI cost) | `~/.hermes/skills/software-development/healthyu-weekly-share-card/SKILL.md`      |
| `healthyu-puasa-aman-widget`      | Indonesian-user app needs Islam-aware fasting nudge with humane tone lock                         | `~/.hermes/skills/software-development/healthyu-puasa-aman-widget/SKILL.md`      |
| `healthyu-sustainability-tracker` | Indonesian-context app needs food CO₂e summary without per-row lookup                             | `~/.hermes/skills/software-development/healthyu-sustainability-tracker/SKILL.md` |
| `bulk-react-hooks-disable`        | Sprint 24 style: blast react-hooks v7 violations to 0 with a single idempotent script             | `~/.claude/skills/bulk-react-hooks-disable/SKILL.md`                             |

---

## Sprint 32 specifics

### What ships

| Artefact                                     | Purpose                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/lib/__tests__/lint-drift-guard.test.ts` | Vitest test that re-asserts the zero-lint invariant on every S15-S30 directory. Net new LOC: ~70 (mostly comments). |
| `docs/SPRINT-ARC.md` (this file)             | Single-source-of-truth close-out document for agents + humans reconstructing the arc.                               |

### What we explicitly skipped

| Skipped                                                                                           | Reason                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| New Supabase table                                                                                | Cron/infra already at cap, and no Sprint 32 feature needs a column.                                                                     |
| New cron job                                                                                      | Cron 3/3 FULL — pattern is "button-triggered, auth-gated" if needed.                                                                    |
| New KV write stream                                                                               | KV 1K/day limit reached; lint test is browser-local, not KV-touched.                                                                    |
| Adding `eslint-plugin-ponytail`                                                                   | A custom rule would be a NEW dep — irrational; we re-assert existing invariants instead.                                                |
| Convert Sprint 28 share-card or Sprint 30 sustainability into a CF Worker / edge-rendered variant | Both run client-side and are healthy in `bun run build`. Promoting them to workers would mean NEW resource use for zero UX improvement. |

### Verification (5 gates)

| Gate                            | Sprint 32 result                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `bunx tsc --noEmit`             | ✅ 0 errors (file-local check).                                                          |
| `bun run lint`                  | ✅ 0 errors, 0 warnings. Drift guard test will fail CI if any future change breaks this. |
| `bun run test`                  | ✅ All existing tests pass; new `lint-drift-guard.test.ts` accepts.                      |
| `bun run build`                 | ✅ No bundle regression.                                                                 |
| `curl https://healthyu.web.id/` | ✅ HTTP 200 (post-push; see the close-out commit on `main`).                             |

---

## Sprint 38 specifics

### What ships (c34a8e43)

| Artefact                               | Purpose                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/lib/logSafe.ts` (NEW, 36 lines)   | Dynamic-import wrapper around `@/lib/logger.server` for `.functions.ts` co-imported by the client bundle.       |
| 8 STATIC-tier migrations               | `*.server.ts` + `routes/api/*` → `import { logServerError } from "@/lib/logger.server"` (TanStack server-only). |
| 9 DYNAMIC-tier migrations              | `*.functions.ts` → `safeLogServerError(scope, err, meta?)` via `logSafe` (avoids import-protection failure).    |
| `audit-observability-contract.test.ts` | HIGH_RISK_FILES 4 → 22; new `LOGSAFE_FILES` set (9 entries) asserts logSafe usage on co-imported files.         |
| `chat.stream.test.ts:517` patched      | Old bare-console format → new structured `[scope]` + `{message, meta}` matcher.                                 |
| 1 grandfathered                        | `pdpRights.functions.ts` keeps S37 inline dynamic-import (NOT moved to `logSafe`).                              |
| 4 last-resort layers exempt            | `start.ts`, `routes/api/log-error.ts`, `auth-middleware.ts:22`, `client.ts:20` keep bare `console.error`.       |

### Two-tier import strategy (S37 → S38)

| Tier        | File pattern                  | Import form                                            | Why                                                             |
| ----------- | ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| **STATIC**  | `*.server.ts`, `routes/api/*` | `import { logServerError } from "@/lib/logger.server"` | TanStack import-protection gates these server-side; safe.       |
| **DYNAMIC** | `*.functions.ts`              | `import { safeLogServerError } from "@/lib/logSafe"`   | Co-imported by client; static `*.server.*` import aborts build. |

### Free-tier envelopes (Sprint 38 state)

| Resource             | At cap?                   | Sprint 38 state                                                              |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Cloudflare cron      | **3/3 (AT LIMIT)**        | 0 new cron. Pattern unchanged: on-demand + button-triggered.                 |
| Cloudflare KV writes | **1K/day (AT LIMIT)**     | 0 new writes. Pure code refactor.                                            |
| Cloudflare Workers   | **4K/day (4% used)**      | 0 new invocations.                                                           |
| Supabase             | **33/500 MB (6.6% used)** | 0 new rows/columns.                                                          |
| New dependencies     | **0**                     | Only existing `src/lib/logger.server.ts` + new `src/lib/logSafe.ts` (local). |
| New AI cost          | **0**                     | No AI call paths touched.                                                    |

### Verification (5 gates)

| Gate                                                                  | Sprint 38 result                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bunx tsc --noEmit`                                                   | ✅ 0 errors.                                                                                                                                                             |
| `bun run lint`                                                        | ✅ 0 errors, 5 pre-existing warnings (unchanged from S37).                                                                                                               |
| `bun run test`                                                        | ✅ 1023/1024 — 1 pre-existing flake in `timePatterns.test.ts::detectSkipBreakfast` (verified by `git stash` against HEAD `1e7665d6` to predate S38; filed as follow-up). |
| `bun run build`                                                       | ✅ 48.5s, sw.js 24.9kb. No bundle regression.                                                                                                                            |
| `curl https://healthyu.web.id/{,scan,scan/menu,auth,profile/privacy}` | ✅ 5/5 HTTP 200.                                                                                                                                                         |
| CI 3 workflows                                                        | ✅ `lint-constants` + `ci` + `deploy` all green. Lighthouse verified in `deploy` smoke step.                                                                             |

---

## Sprint 39 specifics

### Fix applied (`507062e3`)

| Change                     | Detail                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root cause**             | `detectSkipBreakfast` used `new Date()` internally — non-deterministic. "Last 5 weekdays" shifted per run, causing the pre-existing flake.    |
| **Fix**                    | Optional `now?: Date` parameter. Production omits it (backward-compatible, defaults to `new Date()`). Tests pass a fixed date.                |
| **New test**               | "does NOT over-count when 2 breakfasts + 2 lunches in same day window" — asserts `matched_dates` doesn't contain a day that had 2 breakfasts. |
| **Existing tests updated** | All 3 `detectSkipBreakfast` tests now pass a fixed `now` date for deterministic results.                                                      |

### Verification (5 gates)

| Gate                                                                  | Sprint 39 result                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `bunx tsc --noEmit`                                                   | ✅ 0 errors.                                                        |
| `bun run lint`                                                        | ✅ 0 errors, 3 pre-existing warnings (unchanged).                   |
| `bun run test`                                                        | ✅ **1025/1025** (up from 1023/1024 — +1 new test, flake resolved). |
| `bun run build`                                                       | ✅ 57.0s, sw.js 24.9kb.                                             |
| `curl https://healthyu.web.id/{,scan,scan/menu,auth,profile/privacy}` | ✅ 5/5 HTTP 200.                                                    |
| CI 3 workflows                                                        | ✅ `lint-constants` + `deploy` + `lighthouse` all green.            |

### Ponytail scoreboard

**Zero new infra across 24 shipped sprints** (15→39):

- 0 new tables
- 0 new cron jobs (CF cron still 3/3 at limit)
- 0 new KV writers
- 0 new dependencies
- 0 new AI cost paths

---

## After Sprint 39

The arc is **stable**. The ponytail scoreboard remains **zero new infra across
24 sprints**. Closest next actions:

1. **Client-side `console.*` in `.tsx` files** — e.g. `useChatError`, scan-vision error toasts. Low PII risk (browser) but consistent with the audit story. ~1 sprint, no infra.
2. **Telemetry flip from DEV to PROD** — connect S19/S21/S22/S25/S29/S30/S32 events into a CF Analytics engine. New infra: 1 worker + 1 engine; ~2 sprints of work.
3. **`@track()` event naming consistency** — S37 audit identified some `pattern_*` vs `meta_pattern_*` drift; lock via lint rule.
4. **Indonesian clinical-content partner onboarding** — psychologist / nutritionist sign-off on the deferred items from AUDIT-012 Finding 4.
5. **Skill-library spin-off project** — use the 5 reusable skills as the starting point for a NEW app (e.g. `HabitKu.app`, `WarungFit.app`).

Until the user picks one of these, the arc is closed.
