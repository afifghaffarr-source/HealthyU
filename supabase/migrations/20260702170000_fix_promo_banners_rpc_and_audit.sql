-- Sprint 58-D post-fix: sync get_active_banners + audit_promo_banner
--
-- Bug #2 (critical): audit_promo_banner UPDATE branch used `jsonb - jsonb`
--   which is not a valid operator → trigger fails on every UPDATE.
-- Bug #4 (dashboard banners missing): get_active_banners had ambiguous
--   column references (id, placement, etc.) → RPC error 42702.
--
-- Both were hot-patched via Supabase Mgmt API. This migration makes the
-- fix permanent and idempotent so re-running the original sprint58d
-- migration (or a fresh deploy) produces the correct schema.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.

-- ── 1. get_active_banners: table-prefix all columns ──────────────
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

-- ── 2. audit_promo_banner: replace jsonb - jsonb with jsonb_build_object ─
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

-- ── 3. Recreate triggers (DROP IF EXISTS makes this safe to re-run) ──
DROP TRIGGER IF EXISTS promo_codes_audit ON public.promo_codes;
DROP TRIGGER IF EXISTS banners_audit ON public.banners;
CREATE TRIGGER promo_codes_audit AFTER INSERT OR UPDATE OR DELETE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.audit_promo_banner();
CREATE TRIGGER banners_audit AFTER INSERT OR UPDATE OR DELETE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.audit_promo_banner();

-- ── 4. Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
