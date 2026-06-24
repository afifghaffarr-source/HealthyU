-- Sprint 10b: Pattern Detection AI
-- Create pattern_insights table to store detected diet failure patterns

CREATE TABLE IF NOT EXISTS public.pattern_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern classification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    -- Time-based patterns
    'skip_breakfast',
    'late_night_eating',
    'irregular_meals',
    -- Emotional patterns
    'stress_eating',
    'mood_binges',
    'celebration_overeat',
    -- Social patterns
    'gathering_overeat',
    'peer_pressure',
    'weekend_splurge',
    -- Craving patterns
    'sugar_crashes',
    'specific_food_triggers',
    'night_cravings',
    -- Schedule patterns
    'busy_day_skips',
    'rush_meals',
    'workday_weekend_gap',
    -- Location patterns
    'warung_overeat',
    'home_vs_outside',
    'workplace_cafeteria',
    -- Hunger/satiety patterns
    'eating_not_hungry',
    'ignoring_fullness',
    'hunger_disconnect'
  )),
  
  -- Lifecycle timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ NOT NULL,
  
  -- AI analysis results
  urgency_score INTEGER NOT NULL CHECK (urgency_score >= 0 AND urgency_score <= 100),
  ai_explanation TEXT NOT NULL,
  ai_recommendation TEXT NOT NULL,
  quick_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Pattern metrics
  occurrence_count INTEGER NOT NULL CHECK (occurrence_count > 0),
  baseline_count INTEGER,
  
  -- Detection window
  detection_window_start DATE NOT NULL,
  detection_window_end DATE NOT NULL,
  
  -- Debug metadata
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pattern_insights_user_active 
  ON public.pattern_insights(user_id, detected_at DESC) 
  WHERE resolved_at IS NULL;

CREATE INDEX idx_pattern_insights_user_history 
  ON public.pattern_insights(user_id, detected_at DESC);

CREATE INDEX idx_pattern_insights_pattern_type 
  ON public.pattern_insights(pattern_type, detected_at DESC);

-- RLS policies
ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pattern insights"
  ON public.pattern_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all pattern insights"
  ON public.pattern_insights
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pattern_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.pattern_insights IS 'Stores detected diet failure patterns with AI-generated insights and recommendations';
COMMENT ON COLUMN public.pattern_insights.pattern_type IS 'One of 21 pattern types across 7 categories (time, emotional, social, cravings, schedule, location, hunger)';
COMMENT ON COLUMN public.pattern_insights.urgency_score IS 'AI-scored urgency (0-100): combines health impact, goal alignment, and ease of fix';
COMMENT ON COLUMN public.pattern_insights.quick_actions IS 'Array of action objects: [{type: "reminder", label: "Set 7 AM reminder", action_data: {...}}]';
COMMENT ON COLUMN public.pattern_insights.baseline_count IS 'Occurrence count at detection time, used to calculate improvement percentage for auto-resolution';
COMMENT ON COLUMN public.pattern_insights.analysis_metadata IS 'Debug info: rule thresholds, matched dates, avg calories, etc';
