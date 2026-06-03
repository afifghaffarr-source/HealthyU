CREATE TABLE public.wearable_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'google_fit',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_tokens TO authenticated;
GRANT ALL ON public.wearable_tokens TO service_role;

ALTER TABLE public.wearable_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wearable_tokens all" ON public.wearable_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.daily_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  steps integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'google_fit',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_steps TO authenticated;
GRANT ALL ON public.daily_steps TO service_role;

ALTER TABLE public.daily_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daily_steps all" ON public.daily_steps
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);