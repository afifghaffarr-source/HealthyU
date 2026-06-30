-- Sprint 58-B: Notification + email templates (DB-driven)
-- Allows admin to edit email + push notification templates from
-- /admin/notifications without code changes. Replaces hardcoded
-- strings in requestDigest.functions.ts and push.server.ts.

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  template_key TEXT NOT NULL,           -- e.g. 'weekly_digest', 'welcome'
  locale TEXT NOT NULL DEFAULT 'id' CHECK (locale IN ('id', 'en')),
  subject TEXT,                         -- email subject OR push title
  body_text TEXT,                       -- plain text body (email) or null for push
  body_html TEXT,                       -- HTML body (email) or null for push
  variables TEXT[] NOT NULL DEFAULT '{}',  -- declared variables for safety
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (channel, template_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_notif_templates_lookup
  ON public.notification_templates (channel, template_key, locale, is_active);

-- Audit log
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS: admin full access
CREATE POLICY "admin_all_notif_templates_select"
  ON public.notification_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_all_notif_templates_insert"
  ON public.notification_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_all_notif_templates_update"
  ON public.notification_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_all_notif_templates_delete"
  ON public.notification_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Server-side fetch via SECURITY DEFINER function (no auth needed for
-- server-side use; checks role at call time on the server).
CREATE OR REPLACE FUNCTION public.get_notification_template(
  p_channel TEXT,
  p_key TEXT,
  p_locale TEXT DEFAULT 'id'
)
RETURNS TABLE (
  subject TEXT,
  body_text TEXT,
  body_html TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.subject, t.body_text, t.body_html
  FROM public.notification_templates t
  WHERE t.channel = p_channel
    AND t.template_key = p_key
    AND t.locale = p_locale
    AND t.is_active = true
  LIMIT 1;

  -- If not found in requested locale, fallback to 'id' (so users always
  -- get SOMETHING meaningful)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT t.subject, t.body_text, t.body_html
    FROM public.notification_templates t
    WHERE t.channel = p_channel
      AND t.template_key = p_key
      AND t.locale = 'id'
      AND t.is_active = true
    LIMIT 1;
  END IF;
END;
$$;

-- Audit log trigger (reuses pattern from app_config)
CREATE OR REPLACE FUNCTION public.audit_notif_template_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, meta)
  VALUES (
    auth.uid(),
    TG_OP || '_notif_template',
    jsonb_build_object(
      'channel', COALESCE(NEW.channel, OLD.channel),
      'template_key', COALESCE(NEW.template_key, OLD.template_key),
      'locale', COALESCE(NEW.locale, OLD.locale)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_notif_template ON public.notification_templates;
CREATE TRIGGER trg_audit_notif_template
  AFTER INSERT OR UPDATE OR DELETE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.audit_notif_template_change();

-- Seed: weekly digest email (id + en) — matches current hardcoded values
INSERT INTO public.notification_templates
  (channel, template_key, locale, subject, body_text, body_html, variables)
VALUES
  (
    'email', 'weekly_digest', 'id',
    '📊 Ringkasan Pola Makan Mingguan',
    NULL, -- will use existing renderer for now
    NULL,
    ARRAY['user_name', 'pattern_count', 'patterns']
  ),
  (
    'email', 'weekly_digest', 'en',
    '📊 Your Weekly Pattern Digest',
    NULL,
    NULL,
    ARRAY['user_name', 'pattern_count', 'patterns']
  ),
  (
    'push', 'meal_reminder', 'id',
    'Waktunya makan! 🍽️',
    NULL, NULL,
    ARRAY['meal_type']
  ),
  (
    'push', 'meal_reminder', 'en',
    'Time to eat! 🍽️',
    NULL, NULL,
    ARRAY['meal_type']
  ),
  (
    'push', 'water_reminder', 'id',
    'Saatnya minum air 💧',
    NULL, NULL,
    ARRAY[]::TEXT[]
  ),
  (
    'push', 'water_reminder', 'en',
    'Time to drink water 💧',
    NULL, NULL,
    ARRAY[]::TEXT[]
  ),
  (
    'push', 'fasting_sahur', 'id',
    'Sahur time ⏰',
    NULL, NULL,
    ARRAY[]::TEXT[]
  ),
  (
    'push', 'fasting_sahur', 'en',
    'Sahur time ⏰',
    NULL, NULL,
    ARRAY[]::TEXT[]
  ),
  (
    'email', 'welcome', 'id',
    'Selamat datang di HealthyU! 🌱',
    'Hai {user_name}! Senang kamu bergabung. Yuk mulai tracking pola makan dan pola hidup sehatmu.',
    NULL,
    ARRAY['user_name']
  ),
  (
    'email', 'welcome', 'en',
    'Welcome to HealthyU! 🌱',
    'Hi {user_name}! Glad you joined. Let''s start tracking your eating and lifestyle patterns.',
    NULL,
    ARRAY['user_name']
  )
ON CONFLICT (channel, template_key, locale) DO NOTHING;
