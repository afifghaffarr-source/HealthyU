# APPLY MIGRATION: Sprint 12 Meta-Patterns

**Reason:** Automated paths blocked (mgmt API 403 + direct TCP unreachable). Need 30s manual application.

## Steps (30 detik)

1. Buka: https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/sql/new
2. Copy SQL di bawah
3. Paste + Run (Ctrl/Cmd+Enter)
4. Confirm: should see "Success. No rows returned"

## SQL

```sql
ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS is_meta BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS metapattern_id TEXT;

ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS metapattern_components TEXT[];

COMMENT ON COLUMN public.pattern_insights.is_meta IS
  'True if this row represents a meta-pattern (combination of 2+ single patterns)';
COMMENT ON COLUMN public.pattern_insights.metapattern_id IS
  'Stable identifier for meta-pattern. NULL for single patterns.';
COMMENT ON COLUMN public.pattern_insights.metapattern_components IS
  'Array of pattern_type strings composing this meta-pattern';

CREATE UNIQUE INDEX IF NOT EXISTS uq_pattern_insights_meta_per_user
  ON public.pattern_insights (user_id, metapattern_id)
  WHERE is_meta = true AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pattern_insights_meta
  ON public.pattern_insights (user_id, is_meta)
  WHERE is_meta = true;
```

## After Confirm

Bilang "done" di chat → gw langsung regen types + lanjut wire meta-pattern engine.
