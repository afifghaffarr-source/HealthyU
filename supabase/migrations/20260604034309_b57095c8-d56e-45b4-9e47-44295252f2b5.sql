CREATE TABLE public.ai_response_cache (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tier SMALLINT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ai_response_cache_expires_idx ON public.ai_response_cache(expires_at);
GRANT ALL ON public.ai_response_cache TO service_role;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (server admin) accesses it.