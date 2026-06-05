-- 1) Revoke EXECUTE on all our SECURITY DEFINER functions from anon and PUBLIC.
--    Authenticated keeps access (intentional RPC surface; each fn guards on auth.uid()).
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_log() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._get_field_key() FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_sensitive_notes() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_user(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sensitive_note(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_sensitive_note(text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_friend_invite(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.report_content(text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_sensitive_note(uuid, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_group_challenge_bonus(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_co_challenge_participant(uuid, uuid) FROM anon, PUBLIC;

-- 2) Drop redundant service-role catch-all on seo_articles (service_role bypasses RLS).
DROP POLICY IF EXISTS "Service role manages articles" ON public.seo_articles;

-- 3) Tighten barcode_cache insert: require non-empty barcode value.
DROP POLICY IF EXISTS "insert barcode" ON public.barcode_cache;
CREATE POLICY "insert barcode" ON public.barcode_cache
  FOR INSERT TO authenticated
  WITH CHECK (length(coalesce(barcode, '')) BETWEEN 1 AND 64);