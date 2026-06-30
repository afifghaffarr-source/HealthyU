-- Hardening Sprint: Fix audit_promo_banner trigger
-- Bug #2: jsonb - jsonb operator does not exist
-- Root cause: row_to_json(NEW)::jsonb - row_to_json(OLD)::jsonb is invalid syntax
-- Operator - only accepts (jsonb, text) or (jsonb, text[]), not (jsonb, jsonb)
-- Fix: for UPDATE, store row_to_json(NEW) without diff (Ponytail: simpler, still captures full state)

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
