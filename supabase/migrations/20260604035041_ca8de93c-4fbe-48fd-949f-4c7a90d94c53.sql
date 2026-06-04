
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  tier int,
  model text,
  prompt_tokens int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  total_tokens int DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  cache_hit boolean NOT NULL DEFAULT false,
  was_downgraded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai usage" ON public.ai_usage_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_usage_logs_user_time_idx ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_time_idx ON public.ai_usage_logs(created_at DESC);

CREATE OR REPLACE VIEW public.ai_cost_daily
WITH (security_invoker=on) AS
SELECT
  date_trunc('day', created_at) AS day,
  user_id,
  count(*) AS calls,
  sum(CASE WHEN cache_hit THEN 1 ELSE 0 END) AS cache_hits,
  sum(total_tokens) AS tokens,
  sum(cost_usd) AS cost_usd
FROM public.ai_usage_logs
GROUP BY 1, 2;
GRANT SELECT ON public.ai_cost_daily TO authenticated;
