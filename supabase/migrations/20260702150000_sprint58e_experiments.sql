-- Sprint 58-E: A/B test experiments
-- 1 new table: experiments
-- Pattern: key + variant_a_json + variant_b_json + split_pct
-- Deterministic per-user via hash(userId + key) % 100 < split_pct

CREATE TABLE IF NOT EXISTS public.experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  description     TEXT,
  variant_a_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  variant_b_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  split_pct       INTEGER NOT NULL DEFAULT 50 CHECK (split_pct >= 0 AND split_pct <= 100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS experiments_active_idx ON public.experiments(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS experiments_key_idx ON public.experiments(key);

-- RLS: admin write, public read active only
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experiments_admin_all" ON public.experiments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "experiments_public_read" ON public.experiments
  FOR SELECT USING (is_active = TRUE);

-- Audit trigger (reuse pattern from promo/banners)
CREATE TRIGGER experiments_audit AFTER INSERT OR UPDATE OR DELETE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.audit_promo_banner();

-- SECURITY DEFINER: get_experiment_variant
-- Deterministic: hash(user_id || key) % 100 < split_pct → variant_b, else variant_a
CREATE OR REPLACE FUNCTION public.get_experiment_variant(_key TEXT, _user_id UUID DEFAULT NULL)
RETURNS TABLE (
  variant TEXT,
  payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  exp RECORD;
  hash_val INTEGER;
BEGIN
  SELECT * INTO exp
  FROM public.experiments
  WHERE key = _key AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'a'::TEXT, '{}'::JSONB;
    RETURN;
  END IF;

  -- Deterministic hash: if no user_id, always variant_a (default/safe)
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT 'a'::TEXT, exp.variant_a_json;
    RETURN;
  END IF;

  -- Simple hash: sum of char codes of (user_id::text || key) mod 100
  hash_val := 0;
  FOR i IN 1..length(_user_id::text || _key) LOOP
    hash_val := (hash_val + ascii(substr(_user_id::text || _key, i, 1))) % 1000000;
  END LOOP;
  hash_val := hash_val % 100;

  IF hash_val < exp.split_pct THEN
    RETURN QUERY SELECT 'b'::TEXT, exp.variant_b_json;
  ELSE
    RETURN QUERY SELECT 'a'::TEXT, exp.variant_a_json;
  END IF;
END;
$$;

-- Seed: landing hero CTA experiment
INSERT INTO public.experiments (key, label, description, variant_a_json, variant_b_json, split_pct)
VALUES (
  'landing.heroCta',
  'Landing Hero CTA',
  'Test "Mulai gratis" vs "Coba sekarang" for conversion rate',
  '{"ctaLabel": "Mulai gratis sekarang"}'::jsonb,
  '{"ctaLabel": "Coba sekarang"}'::jsonb,
  50
)
ON CONFLICT (key) DO NOTHING;
