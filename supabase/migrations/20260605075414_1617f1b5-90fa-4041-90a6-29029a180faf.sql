
-- Batch C: DB hardening — indexes, explicit deny policies, function privilege lockdown

-- 1. Missing indexes on foreign key columns (improves join + delete cascade perf)
CREATE INDEX IF NOT EXISTS idx_meal_logs_food_item_id ON public.meal_logs(food_item_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_article_bookmarks_article_id ON public.article_bookmarks(article_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_coin_redemptions_reward_id ON public.coin_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_pet_interactions_pet_id ON public.pet_interactions(pet_id);
CREATE INDEX IF NOT EXISTS idx_food_scan_corrections_scan_id ON public.food_scan_corrections(scan_id);
CREATE INDEX IF NOT EXISTS idx_meal_stories_meal_log_id ON public.meal_stories(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_user_pet_accessories_accessory_id ON public.user_pet_accessories(accessory_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reviewed_by ON public.content_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON public.moderation_actions(moderator_id);

-- 2. Explicit deny-all policies for service-only tables (RLS enabled, no policy = invisible to API; make intent explicit so linter is silenced and future code doesn't accidentally widen access)
CREATE POLICY "deny_all_clients" ON public.ai_response_cache FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_clients" ON public.oauth_states FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 3. Revoke EXECUTE on user-scoped SECURITY DEFINER functions from anon (they require auth.uid() anyway). Keep helpers used inside RLS (has_role, is_group_member, is_co_challenge_participant) callable.
REVOKE EXECUTE ON FUNCTION public.block_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_sensitive_note(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_sensitive_note(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sensitive_note(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_sensitive_notes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_content(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_friend_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_group_challenge_bonus(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._get_field_key() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_sensitive_note(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sensitive_note(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sensitive_note(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_sensitive_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_content(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_friend_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_challenge_bonus(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;
