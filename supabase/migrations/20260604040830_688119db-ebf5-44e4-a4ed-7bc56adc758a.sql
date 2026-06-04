-- 1. Audit log
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_user_idx ON public.audit_log(user_id, created_at DESC);
CREATE INDEX audit_log_action_idx ON public.audit_log(action, created_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. RPC for logging (security definer so app-level inserts go through controlled path)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log(user_id, action, entity, entity_id, meta)
  VALUES (auth.uid(), _action, _entity, _entity_id, COALESCE(_meta, '{}'::jsonb));
END;
$$;

-- 3. Encryption key in Vault (only created if missing)
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'field_encryption_key') INTO v_exists;
  IF NOT v_exists THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'field_encryption_key',
      'Field-level encryption key for sensitive health data'
    );
  END IF;
END $$;

-- 4. Sensitive health notes (encrypted at rest)
CREATE TABLE public.sensitive_health_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  encrypted_note bytea NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shn_user_idx ON public.sensitive_health_notes(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensitive_health_notes TO authenticated;
GRANT ALL ON public.sensitive_health_notes TO service_role;

ALTER TABLE public.sensitive_health_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own sensitive notes select"
  ON public.sensitive_health_notes FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users own sensitive notes insert"
  ON public.sensitive_health_notes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own sensitive notes update"
  ON public.sensitive_health_notes FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own sensitive notes delete"
  ON public.sensitive_health_notes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER shn_updated_at
BEFORE UPDATE ON public.sensitive_health_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper: fetch encryption key from Vault (private)
CREATE OR REPLACE FUNCTION public._get_field_key() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'field_encryption_key' LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN v_key;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._get_field_key() FROM PUBLIC, anon, authenticated;

-- 6. CRUD RPCs that encrypt/decrypt automatically
CREATE OR REPLACE FUNCTION public.save_sensitive_note(_title text, _note text, _category text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(coalesce(_note,'')) = 0 OR length(_note) > 20000 THEN
    RAISE EXCEPTION 'invalid note length';
  END IF;
  IF length(coalesce(_title,'')) = 0 OR length(_title) > 255 THEN
    RAISE EXCEPTION 'invalid title length';
  END IF;
  v_key := public._get_field_key();
  INSERT INTO public.sensitive_health_notes(user_id, title, encrypted_note, category)
  VALUES (v_uid, _title, pgp_sym_encrypt(_note, v_key), _category)
  RETURNING id INTO v_id;
  INSERT INTO public.audit_log(user_id, action, entity, entity_id)
  VALUES (v_uid, 'sensitive_note.create', 'sensitive_health_notes', v_id::text);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sensitive_note(_id uuid, _title text, _note text, _category text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(coalesce(_note,'')) = 0 OR length(_note) > 20000 THEN RAISE EXCEPTION 'invalid note length'; END IF;
  IF length(coalesce(_title,'')) = 0 OR length(_title) > 255 THEN RAISE EXCEPTION 'invalid title length'; END IF;
  v_key := public._get_field_key();
  UPDATE public.sensitive_health_notes
     SET title = _title,
         encrypted_note = pgp_sym_encrypt(_note, v_key),
         category = _category,
         updated_at = now()
   WHERE id = _id AND user_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows > 0 THEN
    INSERT INTO public.audit_log(user_id, action, entity, entity_id)
    VALUES (v_uid, 'sensitive_note.update', 'sensitive_health_notes', _id::text);
  END IF;
  RETURN v_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sensitive_note(_id uuid)
RETURNS TABLE(id uuid, title text, note text, category text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_key := public._get_field_key();
  INSERT INTO public.audit_log(user_id, action, entity, entity_id)
  VALUES (v_uid, 'sensitive_note.read', 'sensitive_health_notes', _id::text);
  RETURN QUERY
    SELECT n.id, n.title,
           pgp_sym_decrypt(n.encrypted_note, v_key)::text,
           n.category, n.created_at, n.updated_at
      FROM public.sensitive_health_notes n
     WHERE n.id = _id AND n.user_id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_sensitive_notes()
RETURNS TABLE(id uuid, title text, category text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, category, created_at, updated_at
    FROM public.sensitive_health_notes
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC;
$$;

-- 7. Account deletion request (UU PDP)
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending | processed | cancelled
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT, INSERT, DELETE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own deletion request select"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users own deletion request insert"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own deletion request delete"
  ON public.account_deletion_requests FOR DELETE
  TO authenticated USING (user_id = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.request_account_deletion(_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.account_deletion_requests(user_id, reason)
  VALUES (v_uid, _reason)
  ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, requested_at = now(), status = 'pending'
  RETURNING id INTO v_id;
  INSERT INTO public.audit_log(user_id, action, entity, entity_id, meta)
  VALUES (v_uid, 'account.deletion_requested', 'account_deletion_requests', v_id::text, jsonb_build_object('reason', _reason));
  RETURN v_id;
END;
$$;