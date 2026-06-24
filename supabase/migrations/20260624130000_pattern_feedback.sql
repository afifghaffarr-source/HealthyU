-- Pattern Insights: Add user feedback column
-- Sprint 10b enhancement - track "Was this helpful?"

-- ponytail: add single JSONB column to existing table
ALTER TABLE public.pattern_insights
ADD COLUMN IF NOT EXISTS user_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN public.pattern_insights.user_feedback IS 
'User feedback on pattern insight quality. Format: {"helpful": bool, "submitted_at": timestamp}';

-- No new table needed ✅
