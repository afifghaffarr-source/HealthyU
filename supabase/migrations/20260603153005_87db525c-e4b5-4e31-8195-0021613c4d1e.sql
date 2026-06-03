
-- Seed bonus reward (idempotent via name)
INSERT INTO public.coin_rewards (name, description, category, coin_cost, monetary_value_idr, is_active)
SELECT 'Bonus Challenge Grup', 'Hadiah bonus saat seluruh anggota grup menyelesaikan challenge bareng', 'bonus', 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rewards WHERE name = 'Bonus Challenge Grup');

-- Tracking table
CREATE TABLE public.group_challenge_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  coins_awarded integer NOT NULL DEFAULT 0,
  redemption_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, challenge_id, user_id)
);

GRANT SELECT ON public.group_challenge_bonuses TO authenticated;
GRANT ALL ON public.group_challenge_bonuses TO service_role;

ALTER TABLE public.group_challenge_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bonus read"
  ON public.group_challenge_bonuses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RPC: claim bonus (security definer so it can insert into coin_redemptions/profiles)
CREATE OR REPLACE FUNCTION public.claim_group_challenge_bonus(
  p_group_id uuid,
  p_challenge_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reward_id uuid;
  v_coins integer := 100;
  v_member_count int;
  v_completed_count int;
  v_redemption_id uuid;
  v_already boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  -- Must be a member of the group
  IF NOT EXISTS (SELECT 1 FROM public.friend_group_members WHERE group_id = p_group_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_member');
  END IF;

  -- Group must have linked this challenge
  IF NOT EXISTS (SELECT 1 FROM public.group_challenges WHERE group_id = p_group_id AND challenge_id = p_challenge_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_linked');
  END IF;

  -- Already claimed?
  SELECT TRUE INTO v_already FROM public.group_challenge_bonuses
   WHERE group_id = p_group_id AND challenge_id = p_challenge_id AND user_id = v_uid;
  IF v_already THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  -- All members must have completed
  SELECT count(*) INTO v_member_count FROM public.friend_group_members WHERE group_id = p_group_id;
  SELECT count(*) INTO v_completed_count
    FROM public.friend_group_members m
    JOIN public.challenge_participants cp
      ON cp.user_id = m.user_id AND cp.challenge_id = p_challenge_id
   WHERE m.group_id = p_group_id AND cp.status = 'completed';

  IF v_member_count = 0 OR v_completed_count < v_member_count THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_all_completed',
                              'completed', v_completed_count, 'total', v_member_count);
  END IF;

  -- Lookup reward
  SELECT id INTO v_reward_id FROM public.coin_rewards WHERE name = 'Bonus Challenge Grup' LIMIT 1;
  IF v_reward_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reward_missing');
  END IF;

  -- Insert redemption (system grant: coins_spent=0, delivered)
  INSERT INTO public.coin_redemptions (user_id, reward_id, coins_spent, delivery_status, delivered_at, delivery_data)
  VALUES (v_uid, v_reward_id, 0, 'delivered', now(),
          jsonb_build_object('type', 'group_challenge_bonus',
                             'group_id', p_group_id,
                             'challenge_id', p_challenge_id,
                             'coins_awarded', v_coins))
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.group_challenge_bonuses (group_id, challenge_id, user_id, coins_awarded, redemption_id)
  VALUES (p_group_id, p_challenge_id, v_uid, v_coins, v_redemption_id);

  -- Credit user coins
  UPDATE public.profiles SET health_coins = COALESCE(health_coins, 0) + v_coins WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'coins_awarded', v_coins, 'redemption_id', v_redemption_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_group_challenge_bonus(uuid, uuid) TO authenticated;
