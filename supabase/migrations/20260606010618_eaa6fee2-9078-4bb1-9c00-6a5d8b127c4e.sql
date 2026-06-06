-- Phase 6: Auth & RLS hardening
-- Revoke EXECUTE on internal/trigger SECURITY DEFINER functions from public roles.
-- These run via triggers or as internal helpers — signed-in users must not call them via PostgREST.

REVOKE EXECUTE ON FUNCTION public._get_field_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_profile_metrics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_recipe_save_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_log() FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains access (for cron and admin paths).
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_log() TO service_role;
GRANT EXECUTE ON FUNCTION public._get_field_key() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_profile_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_recipe_save_count() TO service_role;