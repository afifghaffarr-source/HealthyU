# Skill-Library Spin-Off Proposal

**Sprint 44.** Reusable skills as foundation for new app.

## 5 Reusable Skills

| Skill                             | Category                               | Reuse value                           |
| --------------------------------- | -------------------------------------- | ------------------------------------- |
| `healthyu-weekly-share-card`      | Canvas/PNG generation                  | Any app needing shareable image cards |
| `healthyu-puasa-aman-widget`      | Ramadan/fasting widgets                | Any wellness/Islamic app              |
| `healthyu-sustainability-tracker` | Habit tracking with curated dictionary | Any habit/goal tracker                |
| `bulk-react-hooks-disable`        | Code quality tooling                   | Any React 19 migration                |
| `hijri-calendar-features`         | Islamic date + Ramadan/Eid countdown   | Any Islamic app                       |

## New App Candidates

### Option 1 — HabitKu.app

Ponytail: reuse `sustainability-tracker` + `weekly-share-card` directly.

| Component          | Source                                  |
| ------------------ | --------------------------------------- |
| Habit tracker core | `healthyu-sustainability-tracker`       |
| Weekly share card  | `healthyu-weekly-share-card`            |
| UI primitives      | TanStack Start + shadcn/ui (same stack) |
| Auth               | Supabase Auth                           |
| Deploy             | Cloudflare Pages (free tier)            |

### Option 2 — WarungFit.app

Ponytail: reuse `weekly-share-card` + nutrition patterns. Healthy food catalog.

| Component       | Source                               |
| --------------- | ------------------------------------ |
| Food catalog    | extract from HealthyU recipes module |
| Nutrition grade | `scan/health-grade` pattern          |
| Share card      | `healthyu-weekly-share-card`         |

### Option 3 — JurnalRamadhan.app

Ponytail: reuse `puasa-aman-widget` + `hijri-calendar-features`.

| Component        | Source                       |
| ---------------- | ---------------------------- |
| Ramadan calendar | `hijri-calendar-features`    |
| Fasting safety   | `healthyu-puasa-aman-widget` |
| Daily journal    | New — simple CRUD            |

## Recommended: HabitKu.app

Alasan:

1. **Highest reuse** — 2 skills directly reusable, $0 infra
2. **Largest market** — habit tracker is universal (not limited to Ramadan season)
3. **Simple MVP** — 1 page, 3 components, <200 LOC

## Scaffold command

```bash
cd ~/projects
npx create-start@latest HabitKu --tanstack --bun
cd HabitKu
# Copy reusable skills
cp ../HealthyU/src/features/sustainability/ src/features/sustainability/
cp ../HealthyU/src/features/reports/lib/weeklyShareCard.ts src/lib/
```

**Estimated: 2 sprints to MVP. 0 new infra, 0 new deps.**
