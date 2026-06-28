import type { UserDataTable } from "@/lib/userDataTables";

/**
 * User-facing grouping of the 80+ USER_DATA_TABLES into ~12 Indonesian
 * "kategori" buckets for the DataInventorySection display.
 *
 * Why static + hand-curated (instead of auto-derive from table name):
 *   - The grouping exists in service of user comprehension, not search,
 *     so UX is what matters (group weights / labels are editorial).
 *   - One table can appear in at most one bucket (decision recorded in
 *     comment). Adding a new table → add to matching bucket below OR add
 *     a new bucket. The test in `inventoryCategories.test.ts` enforces
 *     "every entry in USER_DATA_TABLES is in some bucket".
 *
 * Ponytail: this is a pure mapping (no IO) so importing it client-side
 * costs nothing and stays tree-shakeable per page.
 */
export type InventoryCategory = {
  /** emoji + short Indonesian label */
  label: string;
  /** one-line explanation shown under the label */
  blurb: string;
  /** table names belonging to this bucket (must exist in USER_DATA_TABLES) */
  tables: readonly string[];
};

/** Bucket order = display order. Most-private first so the headline value lands early. */
export const INVENTORY_CATEGORIES: readonly InventoryCategory[] = [
  {
    label: "🧑 Akun & Preferensi",
    blurb: "Profil, pengaturan, dan preferensi aplikasi Anda.",
    tables: [
      "profiles",
      "notification_preferences",
      "theme_preferences",
      "user_connected_accounts",
      "push_subscriptions",
      "wearable_tokens",
      "notifications",
      "account_deletion_requests",
    ],
  },
  {
    label: "📊 Audit Log Internal",
    blurb: "Catatan sistem tentang aksi akun (login, ekspor, hapus) untuk keamanan & UU PDP.",
    tables: ["audit_log", "user_activity_log", "notifications_log"],
  },
  {
    label: "🍽 Makanan & Resep",
    blurb: "Log makan, meal plan, hasil scan, dan resep yang Anda simpan.",
    tables: [
      "meal_logs",
      "meal_plans",
      "budget_meal_plans",
      "food_scans",
      "food_scan_corrections",
      "recipes",
      "imported_recipes",
      "recipe_bookmarks",
      "recipe_reviews",
      "recipe_ratings",
      "grocery_lists",
    ],
  },
  {
    label: "💧 Hidrasi & Nutrisi",
    blurb: "Catatan air minum, tantangan hidrasi, dan kuis nutrisi.",
    tables: [
      "water_logs",
      "hydration_challenge_members",
      "nutrition_quizzes",
      "daily_login_bonuses",
    ],
  },
  {
    label: "⚖ Berat & Tubuh",
    blurb: "Berat badan, metrik tubuh, foto progres, dan target berat Anda.",
    tables: ["weight_logs", "weight_goals", "body_metrics", "progress_photos", "weekly_goals"],
  },
  {
    label: "🏃 Olahraga & Langkah",
    blurb: "Sesi olahraga, program latihan, dan langkah harian.",
    tables: [
      "workout_sessions",
      "workout_plans",
      "workout_timer_sessions",
      "form_check_sessions",
      "daily_steps",
      "weekly_leaderboard",
      "friend_group_members",
      "group_members",
      "group_challenge_bonuses",
    ],
  },
  {
    label: "😴 Tidur & Alarm",
    blurb: "Log tidur, diary tidur, dan alarm pintar Anda.",
    tables: ["sleep_logs", "sleep_diary", "smart_alarms"],
  },
  {
    label: "🕌 Ibadah & Puasa",
    blurb: "Sesi puasa, jadwal ibadah, dan meditasi.",
    tables: ["fasting_sessions", "fasting_schedules", "meditation_sessions", "streak_freezes"],
  },
  {
    label: "😊 Mood & Catatan Sensitif",
    blurb:
      "Catatan suasana hati dan catatan kesehatan sensitif (opt-in, dienskripsi saat istirahat).",
    tables: ["mood_logs", "sensitive_health_notes", "user_health_conditions", "user_allergies"],
  },
  {
    label: "💊 Obat & Vital",
    blurb: "Daftar obat, jadwal minum, dan tanda vital (opsional).",
    tables: ["medications", "medication_logs", "vitals_logs", "doctor_referrals"],
  },
  {
    label: "💬 Chat dengan AI",
    blurb: "Percakapan Anda dengan AI Coach, beserta laporan yang dihasilkannya.",
    tables: [
      "chat_sessions",
      "chat_messages",
      "ai_reports",
      "ai_weekly_reports",
      "ai_daily_challenges",
      "weekly_report_runs",
    ],
  },
  {
    label: "👥 Komunitas & Story",
    blurb: "Posting, komentar, like, vote keluarga, dan story feed.",
    tables: [
      "community_posts",
      "community_comments",
      "community_likes",
      "story_comments",
      "story_likes",
      "story_photos",
      "meal_stories",
      "family_meal_votes",
      "family_plan_members",
      "search_history",
    ],
  },
  {
    label: "📚 Konten & Artikel",
    blurb: "Bookmark artikel, favorit challenge, dan langganan podcast mingguan.",
    tables: ["article_bookmarks", "challenge_participants", "weekly_podcasts", "habit_stacks"],
  },
  {
    label: "🏆 Pencapaian & Reward",
    blurb: "Statistik, lencana, koin virtual, virtual pets, dan langganan premium (jika ada).",
    tables: [
      "user_stats",
      "user_achievements",
      "achievement_showcase_order",
      "gacha_pulls",
      "reward_transactions",
      "coin_redemptions",
      "xp_logs",
      "subscriptions",
      "user_subscriptions",
      "payment_history",
      "charity_donations",
      "virtual_pets",
      "user_pet_accessories",
    ],
  },
];

/**
 * Total tables covered by INVENTORY_CATEGORIES vs USER_DATA_TABLES.
 * Defensive — must equal lengths so the inventory UI is honest.
 */
export function categorizeAll(userDataTables: readonly UserDataTable[]): {
  covered: string[];
  missing: string[];
} {
  const covered = new Set<string>();
  for (const cat of INVENTORY_CATEGORIES) {
    for (const t of cat.tables) covered.add(t);
  }
  const missing = userDataTables.map((t) => t.table).filter((t) => !covered.has(t));
  return { covered: [...covered], missing };
}
