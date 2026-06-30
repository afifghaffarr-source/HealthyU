-- Sprint 58-D: Promo codes + Banner announcements
-- 2 new tables: promo_codes, banners
-- RLS: admin-only writes, public read for active records

-- ── 1. promo_codes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  description   TEXT,
  reward_type   TEXT NOT NULL DEFAULT 'coins'
                  CHECK (reward_type IN ('coins', 'xp', 'premium_days')),
  reward_value  INTEGER NOT NULL DEFAULT 0,
  max_uses      INTEGER NOT NULL DEFAULT 100,
  uses_remaining INTEGER NOT NULL DEFAULT 100,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS promo_codes_active_idx ON public.promo_codes(is_active) WHERE is_active = TRUE;

-- ── 2. banners ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement      TEXT NOT NULL DEFAULT 'top'
                  CHECK (placement IN ('top', 'middle', 'bottom')),
  title         TEXT NOT NULL,
  description   TEXT,
  cta_label     TEXT,
  cta_href      TEXT,
  color         TEXT NOT NULL DEFAULT 'amber',
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banners_active_idx ON public.banners(is_active, starts_at, ends_at) WHERE is_active = TRUE;

-- ── 3. promo_redemptions (track who redeemed what) ────────────
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  reward_type   TEXT NOT NULL,
  reward_value  INTEGER NOT NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS promo_redemptions_user_idx ON public.promo_redemptions(user_id);

-- ── 4. RLS ──────────────────────────────────────────────────────
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- promo_codes: admin write, public read active only
CREATE POLICY "promo_codes_admin_all" ON public.promo_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "promo_codes_public_read" ON public.promo_codes
  FOR SELECT USING (is_active = TRUE);

-- banners: admin write, public read active only
CREATE POLICY "banners_admin_all" ON public.banners
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "banners_public_read" ON public.banners
  FOR SELECT USING (is_active = TRUE);

-- promo_redemptions: user can insert own, admin can read all
CREATE POLICY "promo_redemptions_user_insert" ON public.promo_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "promo_redemptions_user_read_own" ON public.promo_redemptions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ── 5. SECURITY DEFINER: redeem_promo (atomic check + decrement) ─
CREATE OR REPLACE FUNCTION public.redeem_promo(_code TEXT, _user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  reward_type TEXT,
  reward_value INTEGER,
  message TEXT,
  label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  promo RECORD;
  already_redeemed BOOLEAN;
BEGIN
  -- Check if code exists and is active
  SELECT * INTO promo
  FROM public.promo_codes
  WHERE code = UPPER(_code) AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, 'Kode promo tidak ditemukan atau sudah tidak aktif', NULL::TEXT;
    RETURN;
  END IF;

  -- Check expiry
  IF promo.expires_at IS NOT NULL AND promo.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, 'Kode promo sudah kedaluwarsa', NULL::TEXT;
    RETURN;
  END IF;

  -- Check remaining uses
  IF promo.uses_remaining <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, 'Kuota kode promo sudah habis', NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already redeemed by this user
  SELECT EXISTS(
    SELECT 1 FROM public.promo_redemptions
    WHERE promo_code_id = promo.id AND user_id = _user_id
  ) INTO already_redeemed;

  IF already_redeemed THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, 'Kamu sudah menukar kode ini sebelumnya', NULL::TEXT;
    RETURN;
  END IF;

  -- Decrement uses
  UPDATE public.promo_codes
  SET uses_remaining = uses_remaining - 1, updated_at = NOW()
  WHERE id = promo.id;

  -- Record redemption
  INSERT INTO public.promo_redemptions (promo_code_id, user_id, code, reward_type, reward_value)
  VALUES (promo.id, _user_id, promo.code, promo.reward_type, promo.reward_value);

  -- Apply reward
  IF promo.reward_type = 'coins' THEN
    UPDATE public.user_stats SET coins = coins + promo.reward_value WHERE user_id = _user_id;
  ELSIF promo.reward_type = 'xp' THEN
    UPDATE public.user_stats SET xp = xp + promo.reward_value WHERE user_id = _user_id;
  ELSIF promo.reward_type = 'premium_days' THEN
    -- TODO: integrate with premium system when available
    NULL;
  END IF;

  RETURN QUERY SELECT TRUE, promo.reward_type, promo.reward_value, 'Kode promo berhasil ditukarkan!', promo.label;
END;
$$;

-- ── 6. SECURITY DEFINER: get_active_banners ────────────────────
CREATE OR REPLACE FUNCTION public.get_active_banners(_position TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  placement TEXT,
  title TEXT,
  description TEXT,
  cta_label TEXT,
  cta_href TEXT,
  color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.placement, b.title, b.description, b.cta_label, b.cta_href, b.color
  FROM public.banners b
  WHERE b.is_active = TRUE
    AND b.starts_at <= NOW()
    AND (b.ends_at IS NULL OR b.ends_at > NOW())
    AND (_position IS NULL OR b.placement = _position)
  ORDER BY b.created_at DESC;
END;
$$;

-- ── 7. Audit trigger for both tables ───────────────────────────
-- Reuse existing audit_log table from Sprint 57
CREATE OR REPLACE FUNCTION public.audit_promo_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, meta)
    VALUES (auth.uid(), TG_TABLE_NAME || '.deleted', row_to_json(OLD)::jsonb - 'created_by' - 'updated_at' - 'created_at');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, meta)
    VALUES (auth.uid(), TG_TABLE_NAME || '.updated', jsonb_build_object('id', NEW.id, 'new', row_to_json(NEW)::jsonb - 'created_by' - 'updated_at' - 'created_at'));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, meta)
    VALUES (auth.uid(), TG_TABLE_NAME || '.created', row_to_json(NEW)::jsonb - 'created_by' - 'updated_at' - 'created_at');
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER promo_codes_audit AFTER INSERT OR UPDATE OR DELETE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.audit_promo_banner();

CREATE TRIGGER banners_audit AFTER INSERT OR UPDATE OR DELETE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.audit_promo_banner();

-- ── 8. Seed sample data ─────────────────────────────────────────
INSERT INTO public.promo_codes (code, label, description, reward_type, reward_value, max_uses, uses_remaining, expires_at)
VALUES
  ('WELCOME100', 'Welcome Bonus', '100 coins untuk member baru', 'coins', 100, 1000, 1000, NOW() + INTERVAL '365 days'),
  ('XP50', 'XP Booster', '50 XP gratis', 'xp', 50, 500, 500, NOW() + INTERVAL '90 days'),
  ('HEALTHY2026', 'HealthyU 2026', '200 coins untuk resolusi sehat 2026', 'coins', 200, 200, 200, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.banners (placement, title, description, cta_label, cta_href, color, starts_at, ends_at)
VALUES
  ('top', 'Selamat datang di HealthyU!', 'Gratis selamanya. Mulai perjalanan sehatmu hari ini.', 'Mulai', '/auth', 'emerald', NOW(), NULL),
  ('bottom', 'Promo: WELCOME100', 'Tukar kode WELCOME100 untuk 100 coins gratis!', 'Tukar kode', '/settings', 'amber', NOW(), NOW() + INTERVAL '90 days')
ON CONFLICT DO NOTHING;
