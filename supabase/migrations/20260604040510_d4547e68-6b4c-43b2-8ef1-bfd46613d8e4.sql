CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE public.rate_limit_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_log_user_bucket_time_idx
  ON public.rate_limit_log (user_id, bucket, created_at DESC);

GRANT SELECT, INSERT ON public.rate_limit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_log_id_seq TO authenticated;
GRANT ALL ON public.rate_limit_log TO service_role;
GRANT ALL ON SEQUENCE public.rate_limit_log_id_seq TO service_role;

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own rate log"
  ON public.rate_limit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own rate log"
  ON public.rate_limit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _max_requests int,
  _window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.rate_limit_log
  WHERE user_id = v_uid
    AND bucket = _bucket
    AND created_at > now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_log (user_id, bucket) VALUES (v_uid, _bucket);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '7 days';
$$;