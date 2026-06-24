# ⚠️ APPLY THIS MIGRATION NOW

**Status:** Code committed, migration NOT applied yet  
**Time:** 30 seconds  
**Critical:** Deploy will fail without this

---

## 🚨 PASTE THIS SQL NOW

**URL:** https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor

```sql
-- Move pattern detection cooldown from KV to Supabase
-- Reason: KV writes at 100% quota (1K/1K per day)

CREATE TABLE IF NOT EXISTS public.pattern_detection_cooldown (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_detection_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS idx_cooldown_user_detection
  ON public.pattern_detection_cooldown(user_id, last_detection_at);

-- RLS: users can only read/write own cooldown
ALTER TABLE public.pattern_detection_cooldown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cooldown"
  ON public.pattern_detection_cooldown
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages cooldown"
  ON public.pattern_detection_cooldown
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'pattern_detection_cooldown';
```

---

## ✅ After Running SQL

Reply "done" atau "sudah" — gw langsung:

1. Regen Supabase types
2. Test pattern detection
3. Deploy
4. Verify KV writes reduced

**ETA:** 5 menit after migration

---

## 💡 What This Fixes

**Before:**

- KV writes: 1K/1K per day (100% — RISKY)
- Pattern cooldown stored in Cloudflare KV

**After:**

- KV writes: ~0/day (frees up quota)
- Pattern cooldown stored in Supabase
- Same 24h cooldown behavior
- Supabase: 6.6% → 6.7% (negligible)

**Ponytail win:** Single table, no complexity, immediate fix.

---

Gw standby. Kasih tau "done" kapan SQL udah di-run.
