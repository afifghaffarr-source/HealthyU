-- Fix 4 ERROR-level security findings

-- 1. push_subscriptions: revoke key material columns from client roles
REVOKE SELECT (p256dh, auth) ON public.push_subscriptions FROM authenticated, anon;

-- 2. user_connected_accounts: revoke OAuth tokens from client roles
REVOKE SELECT (access_token, refresh_token) ON public.user_connected_accounts FROM authenticated, anon;

-- 3. wearable_tokens: revoke OAuth tokens from client roles
REVOKE SELECT (access_token, refresh_token) ON public.wearable_tokens FROM authenticated, anon;

-- 4. friend_invites: drop permissive SELECT, replace with owner-scoped
DROP POLICY IF EXISTS "read invite by token" ON public.friend_invites;
CREATE POLICY "read own friend invites"
  ON public.friend_invites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = used_by);
-- Token-based lookup must go through a SECURITY DEFINER RPC server-side
CREATE OR REPLACE FUNCTION public.redeem_friend_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_invite_id uuid;
  v_inviter uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT id, inviter_id INTO v_invite_id, v_inviter
    FROM public.friend_invites
   WHERE token = _token AND used_by IS NULL
   LIMIT 1;
  IF v_invite_id IS NULL THEN RAISE EXCEPTION 'invalid_or_used_invite'; END IF;
  IF v_inviter = v_uid THEN RAISE EXCEPTION 'cannot_redeem_own_invite'; END IF;
  UPDATE public.friend_invites
     SET used_by = v_uid, used_at = now()
   WHERE id = v_invite_id;
  RETURN v_invite_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_friend_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_friend_invite(text) TO authenticated;