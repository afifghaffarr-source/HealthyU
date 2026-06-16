-- AUDIT-017 Phase 3 — Chat retention policy (opt-in, UU PDP compliant)
--
-- Design: matches existing data-retention.ts precedent ("user health data
-- is NEVER auto-deleted without explicit consent per UU PDP"). Retention
-- is OPT-IN. Default is NULL = keep forever. Users who explicitly set a
-- retention period get auto-purge on every new chat message (on-write
-- check, no cron needed).
--
-- See: docs/audit-017-phase3-retention-2026-06-16.md

-- 1. Add chat_retention_days column to profiles
--    NULL = keep forever (default, privacy-preserving)
--    30..3650 = auto-purge chats older than N days
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_retention_days INT;

-- 2. Validate the range at the DB level so a buggy client can't crash
--    the SQL with crazy values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chat_retention_days_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT chat_retention_days_check
  CHECK (chat_retention_days IS NULL OR chat_retention_days BETWEEN 30 AND 3650);

-- 3. SQL function that actually purges a user's old chats.
--    Called from chatPrompt.server.persistUserMessage after a new message
--    is inserted (on-write check). Also callable from Supabase SQL editor
--    for manual cleanup.
--    Returns the number of rows deleted (useful for logging/monitoring).
CREATE OR REPLACE FUNCTION public.purge_user_chats(
  p_user_id UUID,
  p_retention_days INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted INT;
BEGIN
  -- Defensive: same check as the column constraint, but at runtime
  -- so a direct RPC call can't bypass it.
  IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 30 and 3650, got %', p_retention_days;
  END IF;

  v_cutoff := now() - (p_retention_days || ' days')::INTERVAL;
  DELETE FROM public.chat_messages
  WHERE user_id = p_user_id
    AND created_at < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- service_role can call it (for the on-write check via supabaseAdmin)
-- authenticated cannot (users should not be able to invoke arbitrary
-- purges for other users). The retention toggle goes through a
-- separate server function that sets the column via RLS.
REVOKE EXECUTE ON FUNCTION public.purge_user_chats(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_chats(UUID, INT) TO service_role;
