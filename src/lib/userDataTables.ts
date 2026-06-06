/**
 * Canonical source-of-truth for tables yang berisi data milik user.
 * Dipakai oleh PDP export, normal export, dan account deletion.
 *
 * - `table`       : nama tabel di schema public
 * - `ownerColumn` : kolom yang berisi user id (profiles pakai `id`, lainnya `user_id`)
 * - `optional`    : kalau true, error saat query tidak menggagalkan export
 */
export type UserDataTable = {
  table: string;
  ownerColumn: "id" | "user_id";
  optional?: boolean;
};

export const USER_DATA_TABLES: readonly UserDataTable[] = [
  { table: "profiles", ownerColumn: "id" },
  { table: "meal_logs", ownerColumn: "user_id" },
  { table: "meal_plans", ownerColumn: "user_id" },
  { table: "water_logs", ownerColumn: "user_id" },
  { table: "weight_logs", ownerColumn: "user_id" },
  { table: "workout_sessions", ownerColumn: "user_id" },
  { table: "sleep_logs", ownerColumn: "user_id" },
  { table: "fasting_sessions", ownerColumn: "user_id" },
  { table: "mood_logs", ownerColumn: "user_id" },
  { table: "medications", ownerColumn: "user_id" },
  { table: "medication_logs", ownerColumn: "user_id" },
  { table: "vitals_logs", ownerColumn: "user_id" },
  { table: "progress_photos", ownerColumn: "user_id" },
  { table: "daily_steps", ownerColumn: "user_id" },
  { table: "chat_messages", ownerColumn: "user_id" },
  { table: "chat_sessions", ownerColumn: "user_id" },
  { table: "community_posts", ownerColumn: "user_id", optional: true },
  { table: "community_comments", ownerColumn: "user_id", optional: true },
  { table: "user_stats", ownerColumn: "user_id", optional: true },
  { table: "user_achievements", ownerColumn: "user_id", optional: true },
  { table: "food_scans", ownerColumn: "user_id" },
  { table: "sensitive_health_notes", ownerColumn: "user_id", optional: true },
  { table: "challenge_participants", ownerColumn: "user_id", optional: true },
  { table: "notification_preferences", ownerColumn: "user_id", optional: true },
  { table: "push_subscriptions", ownerColumn: "user_id", optional: true },
  { table: "wearable_tokens", ownerColumn: "user_id", optional: true },
  { table: "user_allergies", ownerColumn: "user_id", optional: true },
  { table: "user_health_conditions", ownerColumn: "user_id", optional: true },
  { table: "audit_log", ownerColumn: "user_id", optional: true },
  // --- Phase 2 PDP sweep: cover remaining user-owned tables ---
  { table: "ai_reports", ownerColumn: "user_id", optional: true },
  { table: "ai_weekly_reports", ownerColumn: "user_id", optional: true },
  { table: "ai_daily_challenges", ownerColumn: "user_id", optional: true },
  { table: "achievement_showcase_order", ownerColumn: "user_id", optional: true },
  { table: "article_bookmarks", ownerColumn: "user_id", optional: true },
  { table: "body_metrics", ownerColumn: "user_id", optional: true },
  { table: "budget_meal_plans", ownerColumn: "user_id", optional: true },
  { table: "charity_donations", ownerColumn: "user_id", optional: true },
  { table: "community_likes", ownerColumn: "user_id", optional: true },
  { table: "daily_login_bonuses", ownerColumn: "user_id", optional: true },
  { table: "doctor_referrals", ownerColumn: "user_id", optional: true },
  { table: "family_meal_votes", ownerColumn: "user_id", optional: true },
  { table: "family_plan_members", ownerColumn: "user_id", optional: true },
  { table: "fasting_schedules", ownerColumn: "user_id", optional: true },
  { table: "food_scan_corrections", ownerColumn: "user_id", optional: true },
  { table: "form_check_sessions", ownerColumn: "user_id", optional: true },
  { table: "friend_group_members", ownerColumn: "user_id", optional: true },
  { table: "gacha_pulls", ownerColumn: "user_id", optional: true },
  { table: "grocery_lists", ownerColumn: "user_id", optional: true },
  { table: "group_challenge_bonuses", ownerColumn: "user_id", optional: true },
  { table: "group_members", ownerColumn: "user_id", optional: true },
  { table: "habit_stacks", ownerColumn: "user_id", optional: true },
  { table: "hydration_challenge_members", ownerColumn: "user_id", optional: true },
  { table: "imported_recipes", ownerColumn: "user_id", optional: true },
  { table: "meal_stories", ownerColumn: "user_id", optional: true },
  { table: "meditation_sessions", ownerColumn: "user_id", optional: true },
  { table: "notifications", ownerColumn: "user_id", optional: true },
  { table: "notifications_log", ownerColumn: "user_id", optional: true },
  { table: "nutrition_quizzes", ownerColumn: "user_id", optional: true },
  { table: "payment_history", ownerColumn: "user_id", optional: true },
  { table: "recipe_bookmarks", ownerColumn: "user_id", optional: true },
  { table: "recipe_ratings", ownerColumn: "user_id", optional: true },
  { table: "recipe_reviews", ownerColumn: "user_id", optional: true },
  { table: "recipes", ownerColumn: "user_id", optional: true },
  { table: "reward_transactions", ownerColumn: "user_id", optional: true },
  { table: "search_history", ownerColumn: "user_id", optional: true },
  { table: "sleep_diary", ownerColumn: "user_id", optional: true },
  { table: "smart_alarms", ownerColumn: "user_id", optional: true },
  { table: "story_comments", ownerColumn: "user_id", optional: true },
  { table: "story_likes", ownerColumn: "user_id", optional: true },
  { table: "story_photos", ownerColumn: "user_id", optional: true },
  { table: "streak_freezes", ownerColumn: "user_id", optional: true },
  { table: "subscriptions", ownerColumn: "user_id", optional: true },
  { table: "theme_preferences", ownerColumn: "user_id", optional: true },
  { table: "user_activity_log", ownerColumn: "user_id", optional: true },
  { table: "user_connected_accounts", ownerColumn: "user_id", optional: true },
  { table: "user_pet_accessories", ownerColumn: "user_id", optional: true },
  { table: "user_subscriptions", ownerColumn: "user_id", optional: true },
  { table: "virtual_pets", ownerColumn: "user_id", optional: true },
  { table: "weekly_goals", ownerColumn: "user_id", optional: true },
  { table: "weekly_leaderboard", ownerColumn: "user_id", optional: true },
  { table: "weekly_podcasts", ownerColumn: "user_id", optional: true },
  { table: "weekly_report_runs", ownerColumn: "user_id", optional: true },
  { table: "weight_goals", ownerColumn: "user_id", optional: true },
  { table: "workout_plans", ownerColumn: "user_id", optional: true },
  { table: "workout_timer_sessions", ownerColumn: "user_id", optional: true },
  { table: "xp_logs", ownerColumn: "user_id", optional: true },
  { table: "coin_redemptions", ownerColumn: "user_id", optional: true },
  { table: "account_deletion_requests", ownerColumn: "user_id", optional: true },
];

/**
 * Tables yang punya `user_id` tapi sengaja TIDAK diekspor.
 * Setiap entry harus punya alasan tertulis. Dipakai test untuk memastikan
 * tabel user_id baru tidak terlewat tanpa keputusan eksplisit.
 */
export const EXCLUDED_USER_DATA_TABLES: readonly { table: string; reason: string }[] = [
  { table: "oauth_states", reason: "Ephemeral OAuth state; tidak ada nilai untuk user." },
  { table: "rate_limit_log", reason: "Counter internal sistem, bukan data pribadi user." },
  { table: "ai_cost_daily", reason: "Metrik biaya AI internal, dipisah dari data pengguna." },
  { table: "ai_usage_logs", reason: "Log usage AI internal, di-rotate dan tidak diekspor." },
  { table: "user_roles", reason: "Atribut akses (admin/moderator), bukan PDP user." },
  { table: "voice_transcripts", reason: "Transkrip sementara — dihapus otomatis, tidak diekspor." },
];

/** Legacy table names yang TIDAK boleh muncul lagi (dipakai test). */
export const FORBIDDEN_LEGACY_TABLE_NAMES = [
  "meals",
  "workouts",
  "water_intake",
  "vitals",
] as const;
