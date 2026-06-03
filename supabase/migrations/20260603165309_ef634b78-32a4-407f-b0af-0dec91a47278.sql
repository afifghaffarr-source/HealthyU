
-- 1) Replace permissive challenge_participants SELECT with scoped policy
DROP POLICY IF EXISTS "view participants of joined challenges" ON public.challenge_participants;

CREATE OR REPLACE FUNCTION public.is_co_challenge_participant(_challenge_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = _challenge_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_co_challenge_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_co_challenge_participant(uuid, uuid) TO authenticated;

CREATE POLICY "view co-participants only"
  ON public.challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_co_challenge_participant(challenge_id, auth.uid())
  );

-- 2) Hide push notification cryptographic keys from clients
REVOKE SELECT (p256dh, auth) ON public.push_subscriptions FROM authenticated;
REVOKE SELECT (p256dh, auth) ON public.push_subscriptions FROM anon;

-- 3) Hide OAuth tokens on connected accounts from clients
REVOKE SELECT (access_token, refresh_token) ON public.user_connected_accounts FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.user_connected_accounts FROM anon;

-- 4) Hide wearable OAuth tokens from clients
REVOKE SELECT (access_token, refresh_token) ON public.wearable_tokens FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.wearable_tokens FROM anon;
