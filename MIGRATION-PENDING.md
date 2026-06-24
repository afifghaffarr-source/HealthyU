# ⚠️ MANUAL ACTION REQUIRED

**Migration:** `user_feedback` column for pattern insights

## Why Manual?

Supabase free plan doesn't expose DDL execution via:

- ❌ REST API (`exec_sql` function not available)
- ❌ psql pooler (tenant auth issue)
- ❌ Supabase CLI (login role removed)

Only option: **Dashboard SQL Editor**

## Apply Now (30 seconds)

1. Open: https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor
2. Paste:

```sql
ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS user_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN public.pattern_insights.user_feedback IS
'User feedback: {"helpful": bool, "submitted_at": string}';
```

3. Click **Run**
4. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name='pattern_insights' AND column_name='user_feedback';`

## Impact Until Applied

- ✅ App works (feedback UI gracefully degrades)
- ⚠️ Thumbs up/down buttons will fail silently
- ⚠️ Error logged: "column user_feedback does not exist"

## After Applied

- ✅ Feedback saved to DB
- ✅ No more errors
- ✅ Analytics ready (track helpful%)

## Status

- Code: ✅ Deployed (commit 88cd25b9)
- Migration: ⏳ Pending manual apply
- Blocker: ❌ No (app functional)

**Estimate:** 30 seconds via dashboard
