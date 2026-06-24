# 🚀 APPLY MIGRATION NOW

**Time:** 30 seconds  
**Impact:** Unblocks everything (CI, feedback, digest, tests)

---

## Steps

### 1. Open Supabase SQL Editor

https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor

### 2. Click "New Query"

### 3. Copy-Paste SQL

Open file: `supabase/migrations/APPLY_THIS_NOW.sql`

**Or copy this:**

```sql
CREATE TABLE IF NOT EXISTS public.pattern_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  baseline_count INTEGER,
  urgency_score FLOAT NOT NULL,
  ai_explanation TEXT NOT NULL,
  analysis_metadata JSONB,
  quick_actions JSONB,
  user_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user_id ON public.pattern_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_insights_detected_at ON public.pattern_insights(detected_at);

ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON public.pattern_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON public.pattern_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert patterns" ON public.pattern_insights FOR INSERT WITH CHECK (true);
```

### 4. Click "RUN" (Ctrl+Enter)

Expected output:

```
Success. No rows returned
```

### 5. Verify

Run verification query:

```sql
SELECT table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pattern_insights') as columns
FROM information_schema.tables
WHERE table_name = 'pattern_insights';
```

Expected: `pattern_insights | 14`

---

## After Migration

Kasih tau gw "migration done" atau "sudah", terus gw:

1. Regenerate Supabase types
2. Fix remaining TS errors
3. Test all features
4. Push + deploy
5. Verify production

**ETA setelah migration:** 10-15 menit sampai semua green.

---

Siap apply sekarang?
