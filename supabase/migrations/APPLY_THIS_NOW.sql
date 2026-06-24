-- Sprint 10b + Weekly Digest Migration
-- Apply via: https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor
-- Time: ~30 seconds

-- ============================================================
-- 1. CREATE pattern_insights TABLE
-- ============================================================

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

-- ============================================================
-- 2. CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user_id 
  ON public.pattern_insights(user_id);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_detected_at 
  ON public.pattern_insights(detected_at);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_pattern_type 
  ON public.pattern_insights(pattern_type);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_urgency_score 
  ON public.pattern_insights(urgency_score DESC);

-- ============================================================
-- 3. ADD COMMENTS
-- ============================================================

COMMENT ON TABLE public.pattern_insights IS 
'AI-detected eating patterns with severity scoring and recommendations';

COMMENT ON COLUMN public.pattern_insights.user_feedback IS 
'User feedback: {"helpful": boolean, "submitted_at": ISO8601 string}';

COMMENT ON COLUMN public.pattern_insights.analysis_metadata IS 
'AI engine metadata: model version, confidence scores, detection details';

COMMENT ON COLUMN public.pattern_insights.quick_actions IS 
'Suggested actions: [{"type": "log_meal|set_reminder|view_article", "label": "...", "params": {...}}]';

-- ============================================================
-- 4. ENABLE RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own patterns
CREATE POLICY "Users can view own patterns" 
  ON public.pattern_insights 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can update their own patterns (mark resolved, add feedback)
CREATE POLICY "Users can update own patterns" 
  ON public.pattern_insights 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role can insert patterns (AI detection runs server-side)
CREATE POLICY "Service role can insert patterns" 
  ON public.pattern_insights 
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

-- Check table exists
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pattern_insights') as column_count
FROM information_schema.tables 
WHERE table_name = 'pattern_insights';

-- Expected: pattern_insights | 14
