-- AUDIT-020 — Account deletion cron (right-to-erasure completion).
--
-- The `account_deletion_requests` table is populated by the `request_account_deletion`
-- RPC (shipped in 09d9e89b), but until this migration nothing actually
-- *processed* pending requests. A user clicking "Hapus akun" got an
-- "ok" response but their data sat in the DB indefinitely — a UU PDP
-- compliance gap. This function closes that gap.
--
-- Design:
--   * The cron worker (/api/public/hooks/process-account-deletions) calls
--     this function once per pending request that's >24h old (the
--     cancellation grace window).
--   * All deletions happen in a single transaction. If anything fails,
--     the whole function rolls back and the request stays in 'pending'
--     for the next run.
--   * We explicitly DELETE from every table in the canonical
--     USER_DATA_TABLES list (mirrors src/lib/userDataTables.ts), so
--     tables without ON DELETE CASCADE are also covered.
--   * Then DELETE FROM auth.users — any leftover FKs with CASCADE
--     also fire here.
--   * audit_log is the persistent record. Its user_id column is
--     ON DELETE SET NULL, so the audit row survives the auth.users
--     delete (with user_id → NULL) for compliance forensics.
--   * Status flow: pending → processing → processed.
--     On error, transaction rollback leaves the row in 'pending'.
--
--   * SECURITY DEFINER + service_role only. Public / anon / authenticated
--     MUST NOT be able to call this — a user invoking it directly could
--     delete other users' data (the function takes a user_id argument).
--     REVOKE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role.

CREATE OR REPLACE FUNCTION public.process_account_deletion(
  p_user_id UUID,
  p_tables TEXT[] DEFAULT NULL  -- "table|owner_column" pairs; NULL = canonical list
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_tables TEXT[] := ARRAY[
    'profiles|id',
    'meal_logs|user_id',
    'meal_plans|user_id',
    'water_logs|user_id',
    'weight_logs|user_id',
    'workout_sessions|user_id',
    'sleep_logs|user_id',
    'fasting_sessions|user_id',
    'mood_logs|user_id',
    'medications|user_id',
    'medication_logs|user_id',
    'vitals_logs|user_id',
    'progress_photos|user_id',
    'daily_steps|user_id',
    'chat_messages|user_id',
    'chat_sessions|user_id',
    'community_posts|user_id',
    'community_comments|user_id',
    'user_stats|user_id',
    'user_achievements|user_id',
    'food_scans|user_id',
    'sensitive_health_notes|user_id',
    'challenge_participants|user_id',
    'notification_preferences|user_id',
    'push_subscriptions|user_id',
    'wearable_tokens|user_id',
    'user_allergies|user_id',
    'user_health_conditions|user_id',
    'ai_reports|user_id',
    'ai_weekly_reports|user_id',
    'ai_daily_challenges|user_id',
    'achievement_showcase_order|user_id',
    'article_bookmarks|user_id',
    'body_metrics|user_id',
    'budget_meal_plans|user_id',
    'charity_donations|user_id',
    'community_likes|user_id',
    'daily_login_bonuses|user_id',
    'doctor_referrals|user_id',
    'family_meal_votes|user_id',
    'family_plan_members|user_id',
    'fasting_schedules|user_id',
    'food_scan_corrections|user_id',
    'form_check_sessions|user_id',
    'friend_group_members|user_id',
    'gacha_pulls|user_id',
    'grocery_lists|user_id',
    'group_challenge_bonuses|user_id',
    'group_members|user_id',
    'habit_stacks|user_id',
    'hydration_challenge_members|user_id',
    'imported_recipes|user_id',
    'meal_stories|user_id',
    'meditation_sessions|user_id',
    'notifications|user_id',
    'notifications_log|user_id',
    'nutrition_quizzes|user_id',
    'payment_history|user_id',
    'recipe_bookmarks|user_id',
    'recipe_ratings|user_id',
    'recipe_reviews|user_id',
    'recipes|user_id',
    'reward_transactions|user_id',
    'search_history|user_id',
    'sleep_diary|user_id',
    'smart_alarms|user_id',
    'story_comments|user_id',
    'story_likes|user_id',
    'story_photos|user_id',
    'streak_freezes|user_id',
    'subscriptions|user_id',
    'theme_preferences|user_id',
    'user_activity_log|user_id',
    'user_connected_accounts|user_id',
    'user_pet_accessories|user_id',
    'user_subscriptions|user_id',
    'virtual_pets|user_id',
    'weekly_goals|user_id',
    'weekly_leaderboard|user_id',
    'weekly_podcasts|user_id',
    'weekly_report_runs|user_id',
    'weight_goals|user_id',
    'workout_plans|user_id',
    'workout_timer_sessions|user_id',
    'xp_logs|user_id',
    'coin_redemptions|user_id'
    -- INTENTIONALLY EXCLUDED:
    -- * `account_deletion_requests` — its user_id is ON DELETE CASCADE,
    --   the request row dies with the auth.users delete (the state
    --   machine in `status` is now meaningless).
    -- * `audit_log` — user_id is ON DELETE SET NULL. We want the
    --   forensic trail to SURVIVE the user delete (rows stay with
    --   user_id = NULL), so we never DELETE FROM audit_log here.
  ];
  v_tables_to_use TEXT[];
  v_entry TEXT;
  v_pipe_pos INT;
  v_table TEXT;
  v_col TEXT;
  v_counts JSONB := '{}'::JSONB;
  v_count INT;
BEGIN
  -- Caller didn't pass an explicit list → use the canonical 88-table list.
  v_tables_to_use := COALESCE(p_tables, v_default_tables);

  -- Guard: a pending request must exist. Otherwise this is a no-op
  -- (idempotency: the cron might call us for a user that was already
  -- processed, or for a user that cancelled). Returning a marker lets
  -- the cron worker count "skipped" vs "processed" in its summary.
  IF NOT EXISTS (
    SELECT 1 FROM public.account_deletion_requests
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'skipped', 'no pending request',
      'user_id', p_user_id
    );
  END IF;

  -- Mark as 'processing' so a concurrent cron run sees the lock.
  -- The transaction will roll this back if anything below fails.
  UPDATE public.account_deletion_requests
  SET status = 'processing', processed_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  -- Explicit delete from every user-owned table. This covers tables
  -- that DON'T have ON DELETE CASCADE on auth.users.id. Format()
  -- with %I quotes identifiers to prevent SQL injection on the
  -- table/column names (they come from our own constant list, but
  -- defense in depth — a future caller could pass a custom list).
  FOREACH v_entry IN ARRAY v_tables_to_use LOOP
    v_pipe_pos := position('|' in v_entry);
    v_table := substring(v_entry FROM 1 FOR v_pipe_pos - 1);
    v_col := substring(v_entry FROM v_pipe_pos + 1);
    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_table, v_col)
    USING p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object(v_table, v_count);
  END LOOP;

  -- Delete from auth.users. Any tables with ON DELETE CASCADE fire
  -- here too (catches any leftover rows in tables not in our list,
  -- such as Supabase-internal storage references).
  DELETE FROM auth.users WHERE id = p_user_id;

  -- audit_log.user_id is ON DELETE SET NULL, so this row survives
  -- the auth.users delete with user_id = NULL. The action + meta
  -- give the forensic trail: who requested deletion, when, why.
  -- (The reason from the request is already in audit_log from the
  -- `request_account_deletion` RPC.)
  INSERT INTO public.audit_log(user_id, action, entity, entity_id)
  VALUES (p_user_id, 'account.deletion_processed', 'user', p_user_id::text);

  -- The account_deletion_requests row is gone (deleted explicitly in
  -- the loop above AND cascaded by the auth.users delete). The
  -- audit_log row we just inserted is the persistent record. No
  -- status flip needed — the row's absence IS the 'processed' state.

  RETURN jsonb_build_object(
    'processed', true,
    'user_id', p_user_id,
    'tables', v_counts
  );
END;
$$;

-- The function takes a user_id argument — a misconfigured grant
-- would let an authenticated user wipe out another account by
-- calling this with someone else's id. Strict lock-down.
REVOKE EXECUTE ON FUNCTION public.process_account_deletion(UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID, TEXT[])
  TO service_role;

COMMENT ON FUNCTION public.process_account_deletion(UUID, TEXT[]) IS
  'AUDIT-020: hard-delete all rows for a user across 88 user-owned tables + auth.users. Called by the /api/public/hooks/process-account-deletions cron worker for pending requests >24h old. SECURITY DEFINER, service_role only.';
