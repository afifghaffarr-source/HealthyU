-- Add pattern_preferences to profiles
-- Sprint 11: Custom pattern thresholds (Option A)
-- Stores user-tunable sensitivity settings for pattern detection

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pattern_preferences JSONB DEFAULT '{
  "skip_breakfast_threshold": 3,
  "late_night_hour": 22,
  "irregular_meals_variance": 2,
  "sensitivity": "medium"
}'::jsonb;

COMMENT ON COLUMN public.profiles.pattern_preferences IS 
  'User-tunable pattern detection settings: skip_breakfast_threshold (2-5 days), late_night_hour (20-24), irregular_meals_variance (1-3 hours), sensitivity (low/medium/high)';
