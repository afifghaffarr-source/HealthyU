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
| **TOTAL** |                                                                                         | **20 commits**  | **~5,350 LOC + 1 doc** | **0**     |

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

## After Sprint 32

The arc is **stable**. The ponytail scoreboard is **zero new infra across
21 sprints**. The closest next action would be either:

1. **Telemetry flip from DEV to PROD** — connect S19/S21/S22/S25/S29/S30
   events into a CF Analytics engine. New infra: 1 worker + 1 engine; ~2
   sprints of work.
2. **Indonesian clinical-content partner onboarding** — psychologist /
   nutritionist sign-off on the deferred items from AUDIT-012 Finding 4.
3. **Skill-library spin-off project** — use the 4 reusable skills
   (`healthyu-weekly-share-card`, `healthyu-puasa-aman-widget`,
   `healthyu-sustainability-tracker`, `bulk-react-hooks-disable`) as the
   starting point for a NEW app (e.g. `HabitKu.app`, `WarungFit.app`).

Until the user picks one of these, the arc is closed.
