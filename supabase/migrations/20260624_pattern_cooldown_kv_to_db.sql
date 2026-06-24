-- Move pattern detection cooldown from KV to Supabase
-- Reason: KV writes at 100% quota (1K/1K per day)
-- Impact: Frees up KV for other features

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
