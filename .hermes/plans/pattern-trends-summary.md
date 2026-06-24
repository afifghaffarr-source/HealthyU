# Pattern Trends Enhancement

**Sprint 10b Extension** — Completed 2026-06-24

## Overview

Ponytail implementation: track improvement trends using **existing data only**, zero new tables/migrations.

## Implementation

### Calculation Logic (`patternTrends.ts`)

```typescript
improvementPercent = ((baseline_count - occurrence_count) / baseline_count) * 100;
```

**Example:**

- Baseline: 10 occurrences (when first detected)
- Current: 3 occurrences (today)
- Improvement: (10-3)/10 \* 100 = **70% better** 📈

### Status Thresholds

| Improvement % | Status      | Emoji | Color |
| ------------- | ----------- | ----- | ----- |
| >= +20%       | `improving` | 📈    | Green |
| -20% to +20%  | `stable`    | ➡️    | Gray  |
| <= -20%       | `worsening` | 📉    | Red   |

### UI Display

**Dashboard card + /profile/insights:**

```
3x dalam 14 hari terakhir  📈 70% membaik
```

**Visibility rule:**

- Only shows if `daysTracked >= 7` (prevents noise on new patterns)

## Data Sources (Existing)

From `pattern_insights` table:

- `occurrence_count` — current count in 14-day window
- `baseline_count` — count when first detected
- `detected_at` — timestamp for days tracked calculation

**No new columns needed** ✅

## Free Plan Compliance

| Resource         | Impact               | Status |
| ---------------- | -------------------- | ------ |
| Supabase tables  | 0 new                | ✅     |
| Supabase columns | 0 new                | ✅     |
| CF Workers CPU   | Client-side calc     | ✅     |
| CF KV            | No cache needed      | ✅     |
| Build size       | +1.9KB (tree-shaken) | ✅     |

## Testing

**7 tests passing** (`patternTrends.test.ts`):

- ✅ 70% improvement calculation
- ✅ Worsening detection (current > baseline)
- ✅ Stable range (-20% to +20%)
- ✅ Baseline=0 edge case
- ✅ Days tracked calculation
- ✅ Emoji mapping
- ✅ Color mapping

```bash
bun test src/features/patterns/lib/__tests__/patternTrends.test.ts
# 7 pass, 16 expect() calls, 268ms
```

## Files Modified

1. `src/features/patterns/lib/patternTrends.ts` (NEW, 71 lines)
   - `calculateTrend()`
   - `getTrendEmoji()`
   - `getTrendColor()`

2. `src/features/patterns/components/PatternInsightCard.tsx` (+14 lines)
   - Import trend utilities
   - Display trend badge when `daysTracked >= 7`

3. `src/features/patterns/lib/__tests__/patternTrends.test.ts` (NEW, 89 lines)
   - Unit tests for all trend functions

## Usage Example

```typescript
import { calculateTrend } from "@/features/patterns/lib/patternTrends";

const pattern = {
  occurrence_count: 3,
  baseline_count: 10,
  detected_at: "2026-06-14T00:00:00Z", // 10 days ago
  // ... other fields
};

const trend = calculateTrend(pattern);
// {
//   improvementPercent: 70,
//   status: "improving",
//   daysTracked: 10
// }
```

## Real-World Scenarios

### Scenario 1: User improving

- **Week 1**: Skipped breakfast 10 times → pattern detected (baseline=10)
- **Week 2**: Only skipped 3 times (occurrence_count=3)
- **Trend**: 📈 70% membaik (improving)

### Scenario 2: User stable

- **Week 1**: Late-night eating 8 times → pattern detected (baseline=8)
- **Week 2**: Late-night eating 7 times (occurrence_count=7)
- **Trend**: ➡️ 12% stabil (stable, within ±20%)

### Scenario 3: User regressing

- **Week 1**: Stress eating 5 times → pattern detected (baseline=5)
- **Week 2**: Stress eating 9 times (occurrence_count=9)
- **Trend**: 📉 80% memburuk (worsening, -80% = worse)

## Future Enhancements (if needed)

1. **Historical snapshots** (requires new table)
   - Track `occurrence_count` daily
   - Build line charts
   - Identify inflection points

2. **Trend notifications** (uses existing CF cron)
   - Alert when pattern worsens >50%
   - Celebrate when improved >70%

3. **Comparative trends** (client-side only)
   - Compare multiple patterns
   - Show which patterns improve together

**Current implementation avoids all of the above** to stay ponytail-compliant.

## Production Verification

```bash
# Dashboard accessible
curl -I https://healthyu.web.id/dashboard
# HTTP/2 200 ✅

# Insights page live
curl -I https://healthyu.web.id/profile/insights
# HTTP/2 200 ✅

# Build successful
bun run build
# ✓ built in 31.52s ✅

# Tests passing
bun test src/features/patterns
# 13 pass (6 trigger + 7 trend) ✅
```

## Commit

**f6ad60c2** — `feat(patterns): track improvement trends over time`

- ponytail: zero new tables, uses existing data
- calculation: (baseline - current) / baseline \* 100
- thresholds: >=20% improving, ±20% stable, <=-20% worsening
- UI: shows trend if tracked >= 7 days
- tests: 7/7 passing
- free plan: no new resources

---

**Sprint 10b + Trends Complete** 🎉

- Detection engine (21 patterns)
- On-demand triggers (no cron)
- E2E tests (13 passing)
- Documentation
- Improvement trends (ponytail mode)
