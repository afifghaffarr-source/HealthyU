-- Sprint 12: Meta-pattern detection
-- Meta-pattern = a combo of 2+ single patterns firing together (e.g. stress_eating + late_night_eating)
--
-- ponytail:
-- - reuses pattern_insights table (no new table)
-- - pattern_type holds first component (CHECK constraint stays clean)
-- - metapattern_id column identifies meta-pattern (lookup key)
-- - is_meta flag distinguishes from single patterns
-- - metapattern_components[] lists constituents

ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS is_meta BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS metapattern_id TEXT;

ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS metapattern_components TEXT[];

COMMENT ON COLUMN public.pattern_insights.is_meta IS
  'True if this row represents a meta-pattern (combination of 2+ single patterns)';
COMMENT ON COLUMN public.pattern_insights.metapattern_id IS
  'Stable identifier for the meta-pattern (e.g. stress_late_night_combo). NULL for single patterns.';
COMMENT ON COLUMN public.pattern_insights.metapattern_components IS
  'Array of pattern_type strings that compose this meta-pattern (only set when is_meta=true)';

-- Lookup index for meta-pattern dedup (per user, only active meta rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pattern_insights_meta_per_user
  ON public.pattern_insights (user_id, metapattern_id)
  WHERE is_meta = true AND resolved_at IS NULL;

-- Fetch index for "active meta list" query
CREATE INDEX IF NOT EXISTS idx_pattern_insights_meta
  ON public.pattern_insights (user_id, is_meta)
  WHERE is_meta = true;
