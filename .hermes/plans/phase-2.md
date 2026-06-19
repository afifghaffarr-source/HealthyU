# HealthyU — Phase 2 Prep + Polish Sprint Plan

**Date:** 2026-06-19
**Status:** Phase 1 complete, Phase 2 planning + Polish Sprint in progress
**Owner:** AGR + Hermes
**Production:** https://healthyu.web.id (version `c2ccd450`)

---

## 1. Current State Snapshot (post-Phase 1)

| Metric              | Value                       | Note                                                                                                                                      |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Routes              | 167                         | Public marketing routes covered with `head()` SEO; authenticated routes (most) intentionally not optimized for SEO since behind auth gate |
| Features            | 47                          | `features/{ai, scan, prayer, food, recipes, ...}`                                                                                         |
| Tests               | 567/567 ✓                   | +14 from Sprint 1d nutrition-parser                                                                                                       |
| Build               | ✓                           | 28-56s depending on analyze mode                                                                                                          |
| Lighthouse CI       | ✓                           | accessibility ≥0.9, performance ≥0.7, best-practices ≥0.8, SEO ≥0.8                                                                       |
| CI jobs             | 4                           | ci (lint+test+build), lighthouse, lint-constants                                                                                          |
| Sprint tags shipped | Sprint 1a-1d                | PWA + adhan + AI SDK + OCR                                                                                                                |
| Overhaul shipped    | 4 fixes                     | profile, recommendations, foods, resep                                                                                                    |
| Deploy method       | `python3 scripts/deploy.py` | Workaround for shell token issues                                                                                                         |
| Tests/runtime       | bun 1.2.21 (pinned)         | bun 1.3.x has coverage-v8 bug                                                                                                             |

## 2. Bundle Audit (2026-06-19)

| Chunk                      | Size | Status                        | Action                                                       |
| -------------------------- | ---- | ----------------------------- | ------------------------------------------------------------ |
| `index-DtBViz0_.js`        | 747K | Main entry (vendor+app)       | OK                                                           |
| `index-C6AHlKYc.js`        | 438K | Vendor                        | OK                                                           |
| `jspdf.es.min`             | 377K | Lazy (reports/achievements)   | OK                                                           |
| `generateCategoricalChart` | 351K | Lazy (ClientChart)            | OK                                                           |
| `html2canvas-pro`          | 226K | Lazy (achievements)           | **DUPLICATE** — switch to jspdf's built-in `html2canvas@1.x` |
| `html2canvas.esm`          | 197K | Auto-pulled by jspdf optional | Will disappear if we use jspdf's copy                        |
| `SafeMarkdown`             | 159K | Markdown renderer             | OK                                                           |

**Savings potential:** ~226K by removing `html2canvas-pro` duplicate.

## 3. Codebase Health

| Area               | Status             | Note                                                 |
| ------------------ | ------------------ | ---------------------------------------------------- |
| 404 not-found      | ✓ Wired            | `notFoundComponent: RouteNotFound` in `__root.tsx`   |
| Error boundary     | ✓ Wired            | `errorComponent: RouteError` + `GlobalErrorBoundary` |
| PWA install prompt | ✓ Component exists | **Polished: needs 30s delay**                        |
| Barcode scanner    | ✓ @zxing/browser   | Sprint 1d done                                       |
| Client OCR         | ✓ Tesseract.js     | Sprint 1d done, lazy-loaded                          |
| AI fallback        | ✓ VexoAPI          | Sprint 1c done                                       |
| Offline-first DB   | ❌ Not started     | Phase 2 Sprint 2a: Dexie.js                          |
| Indonesian food DB | ❌ Partial         | Sprint 4a: import Kaggle dataset                     |
| Hijri calendar     | ❌ Not started     | Sprint 2b: moment-hijri                              |
| Streak heatmap     | ❌ Not started     | Sprint 4b: react-activity-calendar                   |
| Meal plan AI       | ❌ Not started     | Sprint 5a: generateObject                            |

## 4. Polish Sprint Scope (2026-06-19)

### Item P1: Remove html2canvas-pro duplicate

- **Effort:** 5 min
- **Impact:** -226K (lazy chunk savings, only loads when user shares achievement)
- **Risk:** Low (basic features same; need to verify share works)
- **Steps:**
  1. Swap `await import("html2canvas-pro")` → `await import("html2canvas")` in `achievements.tsx`
  2. Remove `html2canvas-pro` from package.json
  3. Re-run `bun install`
  4. Verify build still produces only 1 html2canvas chunk
  5. Verify share works (manual test)

### Item P2: Install prompt UX

- **Effort:** 10 min
- **Impact:** Lower new-user friction; PWA installs drive retention
- **Risk:** Very low
- **Steps:**
  1. Add 30s delay before showing prompt in `install-prompt.tsx`
  2. Track "user has done first meaningful action" (localStorage flag set on first scan/recipe view)
  3. Show prompt only if: 30s elapsed OR first action completed

### Item P3: 404 SEO noindex

- **Effort:** 5 min
- **Impact:** Prevent search engines indexing 404 page
- **Risk:** None
- **Steps:**
  1. Add `<meta name="robots" content="noindex" />` to RouteNotFound

### Item P4: Chat loading skeleton

- **Effort:** 15 min
- **Impact:** Better perceived perf for slow chat stream
- **Risk:** Low
- **Steps:**
  1. Add `pendingComponent` to `chat.tsx` with skeleton UI

## 5. Phase 2 Roadmap (from master doc)

### PHASE 0 — Repo Intelligence ✓ (Phase 1 delivered)

- Sprint 1a PWA, 1b adhan, 1c AI SDK, 1d OCR

### PHASE 1 — Quick Win ✓ (Sprint 1-2, 2-4 weeks)

- All 4 sprints shipped

### PHASE 2 — Core Health Tracking Upgrade (Sprint 3-5, 4-6 weeks)

- **Sprint 3 (1-2 weeks):** Offline-first semua tracker (food/water/sleep/mood/fasting/vitals) pakai Dexie + sync ke Supabase
- **Sprint 4a (1 week):** Indonesian food database — Open Food Facts + Kaggle Indonesian Dataset
- **Sprint 4b (1 week):** `react-activity-calendar` heatmap untuk streak
- **Sprint 5a (2-3 days):** Meal plan generator pakai Vercel AI SDK `generateObject` + Zod

### PHASE 3 — Engagement & Retention (Sprint 6-8, 4-6 weeks)

- Streak gamification (badge/streak freeze)
- Family circles (shared goals)
- Push notification reminders
- Doctor referral network

### PHASE 4 — AI Coach Expansion (Sprint 9-10, 3-4 weeks)

- Multimodal meal photo → nutrition (VexoAPI + tesseract.js fallback already done in Phase 1!)
- Form check video analysis
- Personalized weekly podcast
- AI weekly summary

### PHASE 5 — Monetization (Sprint 11, 2-3 weeks)

- Free tier limits (already partially in place)
- Premium features: AI Coach unlimited, family circles, advanced analytics
- Stripe / Midtrans integration

### PHASE 6 — Scale & Polish (Sprint 12+, ongoing)

- A/B testing framework
- Analytics dashboard
- Internationalization (en, ms, th besides id)
- Performance audit (Lighthouse 95+)

## 6. Success Metrics

| Sprint        | Metric                    | Target                        |
| ------------- | ------------------------- | ----------------------------- |
| Polish Sprint | Bundle size (jspdf chunk) | -226K html2canvas dup removed |
| Polish Sprint | PWA install rate          | +20% via better UX            |
| Polish Sprint | 404 SEO                   | noindex set                   |
| Sprint 2a     | Offline scan creation     | Works without network         |
| Sprint 4a     | Indonesian food coverage  | 5000+ items in DB             |
| Sprint 4b     | Streak visualization      | Heatmap rendered              |

## 7. Open Questions for User

- **DEXIE schema design** — auto-generated PK vs compound key? Affects migration strategy.
- **Indonesian food dataset source** — Kaggle vs scrape BPOM vs Open Food Facts?
- **Premium pricing** — Freemium vs one-time? Midtrans vs Stripe?

## 8. Non-Goals (Phase 2)

- ❌ iOS native app (PWA sufficient for Indonesia mobile)
- ❌ Native Android (Capacitor) — only if PWA install rate < 30%
- ❌ Video AI for form check — too compute-heavy, defer to Phase 4
- ❌ Wearable integration (Apple Watch, Garmin) — defer to Phase 5

---

**Last updated:** 2026-06-19
**Next review:** After Polish Sprint deployment
