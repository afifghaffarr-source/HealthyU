/**
 * Pattern Detection Types
 *
 * Type definitions for Sprint 10b Pattern Detection AI feature.
 */

// 21 pattern types across 7 categories
export type PatternType =
  // Time-based patterns (3)
  | "skip_breakfast"
  | "late_night_eating"
  | "irregular_meals"
  // Emotional patterns (3)
  | "stress_eating"
  | "mood_binges"
  | "celebration_overeat"
  // Social patterns (3)
  | "gathering_overeat"
  | "peer_pressure"
  | "weekend_splurge"
  // Craving patterns (3)
  | "sugar_crashes"
  | "specific_food_triggers"
  | "night_cravings"
  // Schedule patterns (3)
  | "busy_day_skips"
  | "rush_meals"
  | "workday_weekend_gap"
  // Location patterns (3)
  | "warung_overeat"
  | "home_vs_outside"
  | "workplace_cafeteria"
  // Hunger/satiety patterns (3)
  | "eating_not_hungry"
  | "ignoring_fullness"
  | "hunger_disconnect";

export type PatternCategory =
  | "time"
  | "emotional"
  | "social"
  | "cravings"
  | "schedule"
  | "location"
  | "hunger";

// Quick action types
export type QuickActionType = "reminder" | "recipes" | "chat" | "tips" | "tracker";

export interface QuickAction {
  type: QuickActionType;
  label: string;
  action_data: Record<string, unknown>;
}

// Pattern insight from database
export interface PatternInsight {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  detected_at: string;
  resolved_at: string | null;
  last_occurrence: string;
  urgency_score: number;
  ai_explanation: string;
  ai_recommendation: string;
  quick_actions: QuickAction[];
  occurrence_count: number;
  baseline_count: number | null;
  detection_window_start: string;
  detection_window_end: string;
  analysis_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user_feedback?: { helpful: boolean; submitted_at: string } | null; // Pending migration
}

// Detected pattern candidate (before AI scoring)
export interface DetectedPattern {
  type: PatternType;
  count: number;
  detected: boolean;
  avg_calories?: number;
  avg_carbs?: number;
  matched_dates: string[];
  metadata: Record<string, unknown>;
}

// Meta-pattern types (combinations of single patterns)
// ponytail: reuses PatternType strings via metapattern_components — no new enum.
export type MetaPatternType =
  | "stress_late_night_combo" // stress_eating + late_night_eating on same days
  | "weekend_indulgence_combo" // weekend_splurge + warung_overeat
  | "emotional_mood_cycle"; // stress_eating + mood_binges

export interface MetaPatternDefinition {
  id: MetaPatternType;
  title: string;
  description: string;
  components: PatternType[]; // required single patterns
  minOverlapDays?: number; // default 2
}

// Scored pattern (after AI or hardcoded scoring)
export interface ScoredPattern extends DetectedPattern {
  score: number;
  reason?: string;
  recommendation?: string;
  quick_actions?: QuickAction[];
}

// User profile snapshot for scoring
export interface UserProfileSnapshot {
  user_id: string;
  age: number | null;
  gender: string | null;
  bmi: number | null;
  goal: string | null;
  daily_calorie_target: number | null;
  health_conditions: string[];
  activity_level: string | null;
}

// Pattern detection result
export interface PatternDetectionResult {
  user_id: string;
  analyzed_at: string;
  window_start: string;
  window_end: string;
  detected_patterns: ScoredPattern[];
  top_pattern: ScoredPattern | null;
  cache_until: string;
}

// Pattern metadata for UI
export const PATTERN_METADATA: Record<
  PatternType,
  {
    category: PatternCategory;
    icon: string;
    title: string;
    description: string;
  }
> = {
  skip_breakfast: {
    category: "time",
    icon: "🍳",
    title: "Sering Skip Sarapan",
    description: "Melewatkan sarapan pada hari kerja",
  },
  late_night_eating: {
    category: "time",
    icon: "🌙",
    title: "Makan Malam Terlalu Larut",
    description: "Makan setelah jam 10 malam",
  },
  irregular_meals: {
    category: "time",
    icon: "⏰",
    title: "Jam Makan Tidak Teratur",
    description: "Waktu makan berubah-ubah drastis",
  },
  stress_eating: {
    category: "emotional",
    icon: "😰",
    title: "Stress Eating",
    description: "Makan banyak saat mood rendah",
  },
  mood_binges: {
    category: "emotional",
    icon: "😔",
    title: "Emotional Binge",
    description: "Makan berlebihan karena emosi",
  },
  celebration_overeat: {
    category: "emotional",
    icon: "🎉",
    title: "Overeat Saat Senang",
    description: "Makan berlebihan saat perayaan",
  },
  gathering_overeat: {
    category: "social",
    icon: "👥",
    title: "Overeat di Acara",
    description: "Makan berlebihan saat kumpul",
  },
  peer_pressure: {
    category: "social",
    icon: "🤝",
    title: "Pengaruh Teman",
    description: "Makan lebih banyak karena ajakan",
  },
  weekend_splurge: {
    category: "social",
    icon: "📅",
    title: "Weekend Splurge",
    description: "Makan berlebihan di akhir pekan",
  },
  sugar_crashes: {
    category: "cravings",
    icon: "🍬",
    title: "Sugar Crash",
    description: "Lonjakan gula diikuti ngidam lagi",
  },
  specific_food_triggers: {
    category: "cravings",
    icon: "🍟",
    title: "Trigger Makanan Tertentu",
    description: "Sering ngidam makanan yang sama",
  },
  night_cravings: {
    category: "cravings",
    icon: "🌃",
    title: "Ngidam Malam",
    description: "Ngemil manis/gurih sore-malam",
  },
  busy_day_skips: {
    category: "schedule",
    icon: "⚡",
    title: "Skip Meals Saat Sibuk",
    description: "Melewatkan makan karena jadwal padat",
  },
  rush_meals: {
    category: "schedule",
    icon: "🏃",
    title: "Makan Terburu-buru",
    description: "Makan cepat tanpa jeda",
  },
  workday_weekend_gap: {
    category: "schedule",
    icon: "📊",
    title: "Pola Weekday vs Weekend Beda",
    description: "Kebiasaan makan sangat berbeda",
  },
  warung_overeat: {
    category: "location",
    icon: "🍽️",
    title: "Overeat di Warung",
    description: "Porsi berlebihan di warung",
  },
  home_vs_outside: {
    category: "location",
    icon: "🏠",
    title: "Makan Luar vs Rumah",
    description: "Kalori lebih tinggi saat di luar",
  },
  workplace_cafeteria: {
    category: "location",
    icon: "🏢",
    title: "Kantin Kantor",
    description: "Pilihan tidak sehat di kantin",
  },
  eating_not_hungry: {
    category: "hunger",
    icon: "🤔",
    title: "Makan Pas Tidak Lapar",
    description: "Makan meski tidak merasa lapar",
  },
  ignoring_fullness: {
    category: "hunger",
    icon: "🤰",
    title: "Mengabaikan Sinyal Kenyang",
    description: "Makan terus sampai terlalu kenyang",
  },
  hunger_disconnect: {
    category: "hunger",
    icon: "❓",
    title: "Disconnect Hunger Signal",
    description: "Sinyal lapar tidak konsisten",
  },
};
