# Pattern Feedback - Manual Migration Instructions

**Migration NOT auto-applied** — Supabase CLI auth issue.

## Apply via Dashboard

1. Open https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor
2. Go to SQL Editor
3. Run:

```sql
ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS user_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN public.pattern_insights.user_feedback IS
'User feedback on pattern insight quality. Format: {"helpful": bool, "submitted_at": timestamp}';
```

4. Verify:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pattern_insights'
AND column_name = 'user_feedback';
```

Expected: 1 row returned (user_feedback | jsonb | YES)

## Free Plan Impact

- ✅ No new tables
- ✅ No new indexes
- ✅ 1 JSONB column only
- ✅ Nullable (no migration of existing rows)

## File Location

`supabase/migrations/20260624130000_pattern_feedback.sql`

## Code Deployed

- Backend: `submitPatternFeedback()` function ✅
- Hook: `usePatternFeedback()` ✅
- UI: Thumbs up/down in PatternInsightCard ✅
- Commit: 4114d87e ✅
- Production: https://healthyu.web.id/dashboard ✅

**Status:** Code deployed, migration pending manual application.
