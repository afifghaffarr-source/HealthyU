-- Sprint 57: Admin Config + i18n Override + User Management
-- Adds 2 new tables (app_config, i18n_overrides), 3 columns to profiles
-- (banned_at, banned_reason, force_logout_at), 2 RPCs (grant_role,
-- revoke_role, ban_user, unban_user), RLS for admin-only writes, and
-- seed data for the 8 critical config keys.

-- ══════════════════════════════════════════════════════════════════
--  app_config — key/value runtime config, all admin-tunable
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_config (
    key          TEXT PRIMARY KEY,
    value        JSONB NOT NULL,
    category     TEXT NOT NULL DEFAULT 'general',
    label        TEXT NOT NULL,
    description  TEXT,
    data_type    TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN ('string','number','boolean','json')),
    options      JSONB,
    is_secret    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_config_category_idx ON public.app_config(category);

COMMENT ON TABLE public.app_config IS 'Runtime config — admins edit from /admin/config, code reads via getAppConfig() server fn';

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_select_admin" ON public.app_config;
CREATE POLICY "app_config_select_admin" ON public.app_config
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "app_config_insert_admin" ON public.app_config;
CREATE POLICY "app_config_insert_admin" ON public.app_config
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "app_config_update_admin" ON public.app_config;
CREATE POLICY "app_config_update_admin" ON public.app_config
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "app_config_delete_admin" ON public.app_config;
CREATE POLICY "app_config_delete_admin" ON public.app_config
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ══════════════════════════════════════════════════════════════════
--  i18n_overrides — DB-backed translation overrides (id/en)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.i18n_overrides (
    key          TEXT NOT NULL,
    locale       TEXT NOT NULL CHECK (locale IN ('id','en')),
    value        TEXT NOT NULL,
    updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (key, locale)
);

CREATE INDEX IF NOT EXISTS i18n_overrides_locale_idx ON public.i18n_overrides(locale);

COMMENT ON TABLE public.i18n_overrides IS 'In-DB translation overrides — admin can edit copy without redeploy. Falls back to bundled i18n.tsx if not present.';

ALTER TABLE public.i18n_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "i18n_overrides_select_admin" ON public.i18n_overrides;
CREATE POLICY "i18n_overrides_select_admin" ON public.i18n_overrides
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "i18n_overrides_insert_admin" ON public.i18n_overrides;
CREATE POLICY "i18n_overrides_insert_admin" ON public.i18n_overrides
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "i18n_overrides_update_admin" ON public.i18n_overrides;
CREATE POLICY "i18n_overrides_update_admin" ON public.i18n_overrides
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "i18n_overrides_delete_admin" ON public.i18n_overrides;
CREATE POLICY "i18n_overrides_delete_admin" ON public.i18n_overrides
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ══════════════════════════════════════════════════════════════════
--  profiles — add ban + force-logout columns
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS banned_reason  TEXT,
    ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════════
--  RPCs — user management actions (admin only)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.grant_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_log (user_id, action, meta) VALUES (
    auth.uid(), 'role.granted', jsonb_build_object('target', _target_user_id, 'role', _role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  INSERT INTO public.audit_log (user_id, action, meta) VALUES (
    auth.uid(), 'role.revoked', jsonb_build_object('target', _target_user_id, 'role', _role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ban_user(_target_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET banned_at = NOW(), banned_reason = _reason WHERE id = _target_user_id;
  INSERT INTO public.audit_log (user_id, action, meta) VALUES (
    auth.uid(), 'user.banned', jsonb_build_object('target', _target_user_id, 'reason', _reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unban_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET banned_at = NULL, banned_reason = NULL WHERE id = _target_user_id;
  INSERT INTO public.audit_log (user_id, action, meta) VALUES (
    auth.uid(), 'user.unbanned', jsonb_build_object('target', _target_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.force_logout_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET force_logout_at = NOW() WHERE id = _target_user_id;
  INSERT INTO public.audit_log (user_id, action, meta) VALUES (
    auth.uid(), 'user.force_logout', jsonb_build_object('target', _target_user_id)
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════
--  Seed — 12 critical app_config keys
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.app_config (key, value, category, label, description, data_type) VALUES
  ('maintenance.enabled', 'false'::jsonb, 'feature', 'Maintenance mode', 'When on, app shows maintenance banner and blocks writes', 'boolean'),
  ('maintenance.message', '"Sedang dalam pemeliharaan. Kami akan kembali sebentar lagi."'::jsonb, 'feature', 'Maintenance message', 'User-facing message during maintenance (ID)', 'string'),
  ('maintenance.message_en', '"Under maintenance. We''ll be back shortly."'::jsonb, 'feature', 'Maintenance message (EN)', 'User-facing message during maintenance (EN)', 'string'),
  ('feature.ai_coach', 'true'::jsonb, 'feature', 'AI Coach enabled', 'Toggle AI Coach chat feature globally', 'boolean'),
  ('feature.scan_label', 'true'::jsonb, 'feature', 'Scan nutrition label', 'Toggle nutrition label OCR feature', 'boolean'),
  ('feature.scan_photo', 'true'::jsonb, 'feature', 'Scan food photo', 'Toggle food photo AI recognition', 'boolean'),
  ('feature.fasting', 'true'::jsonb, 'feature', 'Fasting protocol', 'Toggle fasting timer feature', 'boolean'),
  ('feature.gamification', 'true'::jsonb, 'feature', 'Gamification', 'Toggle XP/coin/streak features globally', 'boolean'),
  ('defaults.calorie_target', '2000'::jsonb, 'defaults', 'Default calorie target', 'Default daily calorie target for new users (kcal)', 'number'),
  ('defaults.fasting_protocol', '"16:8"'::jsonb, 'defaults', 'Default fasting protocol', 'Default fasting protocol for new users', 'string'),
  ('defaults.water_target_ml', '2000'::jsonb, 'defaults', 'Default water target', 'Default daily water target (ml)', 'number'),
  ('gamification.xp_per_calorie_logged', '1'::jsonb, 'gamification', 'XP per calorie logged', 'XP earned per 1 kcal logged in a meal', 'number'),
  ('gamification.coin_per_xp', '0.1'::jsonb, 'gamification', 'Coins per XP', 'Coin conversion rate from XP', 'number'),
  ('gamification.streak_freeze_cost', '50'::jsonb, 'gamification', 'Streak freeze cost', 'Coins required to buy a streak freeze', 'number'),
  ('gamification.daily_login_bonus', '10'::jsonb, 'gamification', 'Daily login bonus', 'Coins awarded for daily login', 'number'),
  ('ui.hero_banner', '"Mulai perjalanan sehatmu hari ini"'::jsonb, 'ui', 'Hero banner text', 'Landing page hero banner headline', 'string'),
  ('ui.show_pricing_card', 'true'::jsonb, 'ui', 'Show pricing card', 'Show Premium pricing card on landing', 'boolean'),
  ('rate_limit.ai_coach_per_hour', '50'::jsonb, 'rate_limit', 'AI coach rate limit', 'Max AI coach messages per user per hour', 'number'),
  ('rate_limit.scan_ocr_per_hour', '30'::jsonb, 'rate_limit', 'OCR rate limit', 'Max OCR scans per user per hour', 'number')
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
--  Done
-- ══════════════════════════════════════════════════════════════════
