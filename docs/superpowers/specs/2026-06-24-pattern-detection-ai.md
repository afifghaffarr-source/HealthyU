# Sprint 10b: Pattern Detection AI — Design Spec

**Status:** Approved  
**Created:** 2026-06-24  
**Author:** AI Agent (approved by AGR)  
**Effort:** 1 week  
**Cost:** $5.40/month per 1000 users

---

## Overview

Detect 7 types of diet failure patterns from 14-day meal logs. Show top pattern on dashboard with AI-generated explanation + quick action buttons. Auto-resolve when user improves 70%+.

**Value:** Proactive coaching, unique differentiator, retention boost.

---

## Design Decisions

1. **Scope:** All 7 pattern types (time, emotional, social, cravings, schedule, location, hunger)
2. **Detection:** Hybrid (SQL rules flag candidates → AI scores urgency)
3. **Window:** 14 days rolling (catches weekly cycles)
4. **Priority:** AI-scored by urgency + actionability + user context
5. **Trigger:** Smart (3+ new meals OR 24h passed, cache 24h)
6. **Storage:** New `pattern_insights` table (relational, history tracking)
7. **Resolution:** Auto after 14 days if occurrence drops 70%
8. **Recommendations:** Text + quick action buttons (reminders, recipes, chat, tips)
9. **Cost optimization:** Hybrid scoring (70% hardcoded, 30% AI) + compressed input (250 tokens)

---

## Architecture

```
User logs meals
    ↓
Smart trigger (3+ meals OR 24h)
    ↓
Fetch 14-day meal logs (SQL)
    ↓
7 Rule Engines (parallel) → flag pattern candidates
    ↓
Hybrid Scoring:
  - 70% cases: hardcoded priority (health conditions, goals, frequency, calories)
  - 30% cases: AI refine (Gemini Flash, compressed input 250 tokens)
    ↓
Save to pattern_insights table
    ↓
Dashboard reads top pattern (24h cache)
    ↓
User sees card + quick actions
    ↓
Auto-resolve after 14 days if 70%+ improvement
```

---

## 7 Pattern Types

### 1. Time-based

- `skip_breakfast`: <3 breakfasts in 5 weekdays
- `late_night_eating`: Meals after 10pm, 3+x/week
- `irregular_meals`: Meal time variance >3h day-to-day

### 2. Emotional

- `stress_eating`: mood_before ≤2 + high calories (>600), 3+x
- `mood_binges`: Low mood → high calories → mood stays low
- `celebration_overeat`: mood_before ≥4 + >800 kcal, 2+x/week

### 3. Social

- `gathering_overeat`: Restaurant/cafe + >1000 kcal, 2+x
- `peer_pressure`: Group locations + larger portions
- `weekend_splurge`: Weekend calories 30%+ higher than weekday

### 4. Cravings

- `sugar_crashes`: High carbs (>60%) → eat again <2h, 3+x/week
- `specific_food_triggers`: Same high-cal food >5x in 14 days
- `night_cravings`: Sweet/savory after 9pm, 3+x/week

### 5. Schedule

- `busy_day_skips`: <2 meals logged, 3+x/week
- `rush_meals`: Meals <10min apart (eating rushed)
- `workday_weekend_gap`: Weekday vs weekend pattern drastically different

### 6. Location

- `warung_overeat`: Warung location + avg >700 kcal, 5+x
- `home_vs_outside`: Outside eating 40%+ higher calories
- `workplace_cafeteria`: Cafeteria + high carbs/fat, >5x/week

### 7. Hunger/Satiety

- `eating_not_hungry`: hunger_before ≤2 but eat >500 kcal, 3+x/week
- `ignoring_fullness`: hunger_after ≥4 (stuffed), 3+x
- `hunger_disconnect`: Hunger signals inconsistent with behavior

---

## Database Schema

```sql
CREATE TABLE pattern_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'skip_breakfast', 'late_night_eating', 'irregular_meals',
    'stress_eating', 'mood_binges', 'celebration_overeat',
    'gathering_overeat', 'peer_pressure', 'weekend_splurge',
    'sugar_crashes', 'specific_food_triggers', 'night_cravings',
    'busy_day_skips', 'rush_meals', 'workday_weekend_gap',
    'warung_overeat', 'home_vs_outside', 'workplace_cafeteria',
    'eating_not_hungry', 'ignoring_fullness', 'hunger_disconnect'
  )),

  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ NOT NULL,

  urgency_score INTEGER NOT NULL CHECK (urgency_score >= 0 AND urgency_score <= 100),
  ai_explanation TEXT NOT NULL,
  ai_recommendation TEXT NOT NULL,
  quick_actions JSONB NOT NULL DEFAULT '[]',

  occurrence_count INTEGER NOT NULL,
  baseline_count INTEGER,

  detection_window_start DATE NOT NULL,
  detection_window_end DATE NOT NULL,
  analysis_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_insights_user_active
  ON pattern_insights(user_id, detected_at)
  WHERE resolved_at IS NULL;
```

---

## Hybrid Scoring Logic

**Hardcoded Rules (70% coverage, 0 cost):**

```typescript
IF health_conditions = diabetes:
  IF sugar_crashes → score = 90
  IF late_night + high_carb → score = 85

IF goal = weight_loss:
  IF stress_eating → score = 80
  IF celebration_overeat → score = 75

Frequency boost:
  IF count >= 7 → score += 10
  IF count >= 10 → score += 5

Calorie boost:
  IF avg_calories > 700 → score += 8
  IF avg_calories > 1000 → score += 5
```

**AI Refinement (30% cases, $0.0006/analysis):**

Compressed input (250 tokens):

```
28M,75kg→70kg,prediabetes,1800kcal,sedentary
Patterns:skip_breakfast:5x;late_night:3x 400kcal carbs;stress_eating:4x mood≤2 700kcal
```

AI output (300 tokens):

```json
[
  { "type": "stress_eating", "score": 85, "reason": "...", "recommendation": "..." },
  { "type": "late_night", "score": 70, "reason": "..." },
  { "type": "skip_breakfast", "score": 60, "reason": "..." }
]
```

**Cost:**

- 70% cases: $0
- 30% cases: $0.0006
- **Monthly per user:** $0.0054 (~30 analyses/month)
- **1000 users:** $5.40/month

---

## UI Components

### Dashboard Pattern Card

- Icon + pattern title
- AI explanation (2-3 sentences)
- Quick action buttons (2-3 buttons)
- Meta: "Detected X days ago · Nx occurrence"
- Dismiss link: "Sudah saya handle, hide ini"

### Profile Insights Page (`/profile/insights`)

- Active patterns section (red dot)
- Resolved patterns section (green checkmark)
- Each pattern: card with detail modal link

### Quick Actions

- `reminder`: Set time-based alarm/notification
- `recipes`: Navigate to filtered recipe list
- `chat`: Open AI coach with pre-filled question
- `tips`: Show tips modal
- `tracker`: Navigate to mood/hunger tracker

---

## Implementation Checklist

### Phase 1: Core Detection (2 days)

- [ ] Create migration: `0010_pattern_insights.sql`
- [ ] Build 7 rule engine functions (time, emotional, social, etc)
- [ ] Write unit tests for each rule (60% coverage)
- [ ] Build pattern detection service orchestrator

### Phase 2: Hybrid Scoring (1 day)

- [ ] Implement hardcoded priority rules
- [ ] Build compressed input formatter (600 → 250 tokens)
- [ ] Integrate Gemini Flash for AI refinement
- [ ] Write scoring tests + AI mocks

### Phase 3: Trigger & Caching (1 day)

- [ ] Smart trigger logic (3 meals OR 24h)
- [ ] 24h cache implementation (KV or in-memory)
- [ ] Cron job setup (Cloudflare Workers scheduled)
- [ ] Auto-resolution checker

### Phase 4: UI Components (2 days)

- [ ] Dashboard PatternInsightCard component
- [ ] Profile insights page + routing
- [ ] Pattern detail modal
- [ ] Quick action button handlers
- [ ] Empty states + loading skeletons

### Phase 5: Testing & Polish (1 day)

- [ ] Integration tests (full pipeline)
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (dashboard + profile flows)
- [ ] Performance benchmarks (<2s analysis, <35% AI usage)

---

## Success Metrics

**Technical:**

- Pattern detection runs <2s per user
- AI usage <35% of cases (70%+ hardcoded)
- Cache hit rate >60%
- Zero N+1 queries

**Product:**

- 60%+ users see at least 1 pattern within 14 days
- 30%+ users click quick action button
- 20%+ patterns auto-resolve within 30 days
- <5% manual dismiss rate (indicates helpful patterns)

**Cost:**

- $5.40/month per 1000 active users
- 85% cheaper than naive AI-only approach ($30)

---

## Deployment

**Platform:** Cloudflare Pages (NOT Vercel)  
**Cron:** Cloudflare Workers scheduled trigger (hourly)  
**Migration:** Run via Supabase CLI or management API  
**Rollout:** Feature flag gated, 10% → 50% → 100%

---

## Future Enhancements (Post-MVP)

1. **Pattern trends:** Graph showing pattern frequency over 8 weeks
2. **Pattern correlations:** "Users who fix X often also fix Y"
3. **Customizable thresholds:** Let user adjust sensitivity
4. **Pattern notifications:** Push alert when new pattern detected
5. **Social features:** Anonymous pattern stats ("60% users have this too")

---

## Risks & Mitigations

**Risk:** AI costs spiral if usage >30%  
**Mitigation:** Monitor AI call rate, adjust hardcoded rules if needed

**Risk:** False positives annoy users  
**Mitigation:** High thresholds (min 3 occurrences), easy dismiss

**Risk:** Patterns feel judgmental  
**Mitigation:** Non-judgmental language (Sprint 10a Indonesia context), focus on solutions

**Risk:** Auto-resolve too aggressive (70% threshold)  
**Mitigation:** Monitor resolution rate, adjust to 60% or 80% based on data

---

## Approved By

- [x] AGR (2026-06-24)
- [x] All 9 design decisions confirmed
- [x] Cost optimization strategy (Option D: Hybrid + Compression)
- [x] Full 30-min design process completed

**Status:** Ready for implementation ✅
