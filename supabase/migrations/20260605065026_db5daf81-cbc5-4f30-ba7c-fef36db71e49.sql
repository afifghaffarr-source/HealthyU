CREATE TABLE public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  nonce text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.oauth_states TO service_role;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: service_role bypasses RLS and is the only intended accessor.

CREATE INDEX oauth_states_user_provider_idx ON public.oauth_states(user_id, provider);
CREATE INDEX oauth_states_expires_idx ON public.oauth_states(expires_at);