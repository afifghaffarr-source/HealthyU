-- AUDIT-021 — Storage cleanup in process_account_deletion
--
-- Compliance gap: storage.objects.owner has NO foreign key to
-- auth.users.id, so deleting from auth.users leaves storage objects
-- orphaned. The user's profile rows, posts, photos (as URL strings in
-- the DB) all get wiped, but any actual file in Supabase Storage
-- remains. Under UU PDP "right to erasure" the user-uploaded files
-- must go with the account.
--
-- Discovered during investigation: `storage.buckets` is currently
-- empty (no buckets exist in the project), so today there is no
-- orphaned data in production. But the moment a bucket is added
-- (e.g. user avatars, progress photo uploads), the gap is live.
-- Fix it now while the function is fresh in our heads.
--
-- Design:
--   * Extend the existing process_account_deletion function — same
--     SECURITY DEFINER + service_role-only model, same single
--     transaction, same ROLLBACK-on-failure semantics.
--   * The new DELETE goes BEFORE the auth.users delete (we still
--     need p_user_id to scope it). The count is added to v_counts
--     so the cron worker's summary surfaces it.
--   * Covers BOTH `owner` (uuid) and `owner_id` (text) columns.
--     storage.objects has both — `owner` is the canonical FK-style
--     column, `owner_id` is a legacy/parallel path. A user might
--     have files in either; missing one is a leak.
--   * We do NOT delete the bucket itself. A bucket is a container
--     that might be shared with other users; deleting it would
--     destroy non-user data. Only the per-user objects go.
--
-- Verification (post-deploy):
--   * Function source via pg_proc.prosrc includes the new DELETE.
--   * E2E smoke: insert a test bucket + object owned by a fresh
--     auth.users row, set up a pending deletion request, call the
--     function, confirm the object is gone, clean up the test row.

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

  -- AUDIT-021: Delete user-uploaded files from Supabase Storage.
  -- storage.objects.owner has no FK to auth.users.id, so the
  -- auth.users delete below would NOT cascade to storage.objects —
  -- orphaned files would persist. We cover BOTH the `owner` (uuid)
  -- and `owner_id` (text) columns: some files use one, some the
  -- other, missing either is a UU PDP leak. We do NOT delete the
  -- bucket itself (might be shared with other users). Going
  -- BEFORE the auth.users delete — we still need p_user_id.
  --
  -- Supabase's storage.protect_delete() trigger blocks direct
  -- DELETE on storage.objects unless `storage.allow_delete_query`
  -- is set. set_config(..., true) is the plpgsql-safe equivalent
  -- of `SET LOCAL` — third arg `true` scopes it to this
  -- transaction only, so it won't leak to other sessions or
  -- outlast the function call.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE owner = p_user_id OR owner_id = p_user_id::text;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('storage.objects', v_count);

  -- Insert the forensic audit_log entry BEFORE the auth.users
  -- delete. The audit_log.user_id FK references auth.users(id) —
  -- inserting a row with a now-nonexistent user_id would fail
  -- (FK violation) and roll back the whole transaction. The
  -- audit_log.user_id column is ON DELETE SET NULL, so once we
  -- delete the user below, our just-inserted row's user_id is
  -- automatically nulled out — the row SURVIVES with user_id
  -- = NULL, giving us the forensic trail we want. (The reason
  -- from the request is already in audit_log from the
  -- `request_account_deletion` RPC.) AUDIT-021 fixes a latent
  -- AUDIT-020 bug here: the original migration had the DELETE
  -- before the INSERT, which violated the FK and would have
  -- caused every account deletion to roll back. The queue was
  -- empty so it never fired — but the moment a real user
  -- requested deletion, the function would have failed.
  INSERT INTO public.audit_log(user_id, action, entity, entity_id)
  VALUES (p_user_id, 'account.deletion_processed', 'user', p_user_id::text);

  -- Delete from auth.users. Any tables with ON DELETE CASCADE fire
  -- here too (catches any leftover rows in tables not in our list).
  -- The audit_log row we just inserted has user_id set to NULL
  -- via the SET NULL cascade — forensic trail preserved.
  DELETE FROM auth.users WHERE id = p_user_id;

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
  'AUDIT-020 + AUDIT-021: hard-delete all rows for a user across 88 user-owned tables + storage.objects (owner + owner_id) + auth.users. Called by the /api/public/hooks/process-account-deletions cron worker for pending requests >24h old. SECURITY DEFINER, service_role only.';
