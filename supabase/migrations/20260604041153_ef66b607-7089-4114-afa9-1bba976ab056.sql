-- 1. Privacy flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_weight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_meals boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_progress_photos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_workouts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_dm boolean NOT NULL DEFAULT true;

-- 2. Content reports
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post','comment','message','user','recipe','photo')),
  content_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','self_harm','nudity','misinformation','medical_advice','other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_reports_status_idx ON public.content_reports(status, created_at DESC);
CREATE INDEX content_reports_target_idx ON public.content_reports(content_type, content_id);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter or moderator can read"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid()
         OR public.has_role(auth.uid(),'moderator')
         OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated users can report"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Moderators can update reports"
  ON public.content_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- 3. Blocked users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocked_users_blocker_idx ON public.blocked_users(blocker_id);

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner blocks: select"
  ON public.blocked_users FOR SELECT
  TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "Owner blocks: insert"
  ON public.blocked_users FOR INSERT
  TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Owner blocks: delete"
  ON public.blocked_users FOR DELETE
  TO authenticated USING (blocker_id = auth.uid());

-- 4. Moderation actions
CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('warn','hide_content','mute','ban','unban')),
  content_type text,
  content_id text,
  reason text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_target_idx ON public.moderation_actions(target_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Target or moderator can read"
  ON public.moderation_actions FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid()
         OR public.has_role(auth.uid(),'moderator')
         OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Only moderators insert"
  ON public.moderation_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- 5. RPCs
CREATE OR REPLACE FUNCTION public.report_content(
  _content_type text,
  _content_id text,
  _reason text,
  _details text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(coalesce(_details,'')) > 1000 THEN RAISE EXCEPTION 'details too long'; END IF;
  INSERT INTO public.content_reports(reporter_id, content_type, content_id, reason, details)
  VALUES (v_uid, _content_type, _content_id, _reason, _details)
  RETURNING id INTO v_id;
  INSERT INTO public.audit_log(user_id, action, entity, entity_id, meta)
  VALUES (v_uid, 'content.reported', _content_type, _content_id, jsonb_build_object('reason',_reason));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_user(_target uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF v_uid = _target THEN RAISE EXCEPTION 'cannot block self'; END IF;
  INSERT INTO public.blocked_users(blocker_id, blocked_id)
  VALUES (v_uid, _target)
  ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET created_at = blocked_users.created_at
  RETURNING id INTO v_id;
  INSERT INTO public.audit_log(user_id, action, entity, entity_id)
  VALUES (v_uid, 'user.blocked', 'user', _target::text);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(_target uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  DELETE FROM public.blocked_users WHERE blocker_id = v_uid AND blocked_id = _target;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows > 0 THEN
    INSERT INTO public.audit_log(user_id, action, entity, entity_id)
    VALUES (v_uid, 'user.unblocked', 'user', _target::text);
  END IF;
  RETURN v_rows > 0;
END;
$$;