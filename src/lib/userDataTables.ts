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

export const USER_DATA_TABLES = [
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
] as const satisfies readonly UserDataTable[];

/** Legacy table names yang TIDAK boleh muncul lagi (dipakai test). */
export const FORBIDDEN_LEGACY_TABLE_NAMES = [
  "meals",
  "workouts",
  "water_intake",
  "vitals",
] as const;