# Plan Migrasi Bertahap HealthyU Schema

Existing schema HealthyU sudah punya 25+ tabel (`profiles`, `meal_logs`, `workout_sessions`, `fasting_sessions`, `water_logs`, `mood_logs`, `vitals_logs`, `weight_logs`, `sleep_logs`, `recipes`, `community_posts`, `achievements`, `user_stats`, dll). Target 58-tabel akan dicapai dengan **extend** kolom yang kurang + **add** tabel yang belum ada, tanpa drop apapun.

## Mapping existing → target

| Target (prompt) | Existing | Aksi |
|---|---|---|
| `users` | `profiles` (PK = auth.users.id) | EXTEND — tetap pakai `profiles`, tambah kolom |
| `meal_logs` + `meal_log_items` | `meal_logs` (flat) | EXTEND `meal_logs`, tambah `meal_log_items` opsional nanti |
| `workout_logs` + `workout_log_items` | `workout_sessions` | EXTEND, alias view nanti |
| `body_metrics` | `weight_logs` + `vitals_logs` | TAMBAH `body_metrics` baru (komposit) |
| `fasting_logs` | `fasting_sessions` | EXTEND |
| `step_logs` | `daily_steps` | EXTEND |
| `chat_messages` | sudah ada | EXTEND + tambah `chat_sessions`, `ai_reports` |
| `community_posts` | sudah ada | EXTEND + `post_likes` (sudah ada `community_likes`), `post_comments` (ada `community_comments`) |
| `community_groups` / `group_members` | `friend_groups` / `friend_group_members` | EXTEND |

## Modul (urutan migration, tiap modul = 1 migration file)

### Migration 1 — CORE & Profile extend
- Extend `profiles`: `bmi`, `bmi_category`, `bmr`, `tdee`, `ideal_weight_min/max`, `health_score`, `health_age`, `daily_protein/carbs/fat/fiber/water_target`, `daily_steps_target`, `total_xp` (mirror), `health_coins`, `streak_days` (mirror), `timezone`, `theme`, `location_province`, `location_lat`, `location_lng`, `premium_status`, `premium_expires_at`, `referral_code`, `referred_by`, `fcm_token`, `platform`, `phone`, `blood_type`
- Tabel baru: `user_health_conditions`, `user_allergies` (struktur), `user_connected_accounts` (wearable + auth providers)

### Migration 2 — NUTRITION extend
- Extend `food_items`: `slug`, `cuisine`, `brand`, `barcode`, `glycemic_load`, `is_halal`, `is_vegetarian`, `is_vegan`, `is_gluten_free`, `is_keto_friendly`, `is_diabetic_friendly`, `health_rating`, `common_portions JSONB`, `bpom_number`, `is_verified`, `times_logged`, `is_active`, `deleted_at`, vitamin/mineral cols
- Extend `meal_logs`: `total_fiber_g`, `total_sugar_g`, `total_sodium_mg`, `mood_before/after`, `hunger_level_before/after`, `location_name`, `source`, `notes`, `photo_url`, `log_date`, `deleted_at`
- Tabel baru: `meal_log_items`, `food_alternatives`, `food_scans`, `recipe_ratings`
- Extend `recipes`: `slug`, `video_url`, `cuisine`, `tags JSONB`, `estimated_cost_idr`, `is_halal`, `is_vegetarian`, `is_vegan`, `is_keto_friendly`, `view/save/cook_count`, `avg_rating`, `rating_count`, `is_published`, `is_featured`, `user_id`, `deleted_at`
- Extend `meal_plans`: `plan_name`, `plan_type`, `start_date`, `end_date`, `target_protein/carbs/fat`, `daily_budget_idr`, `diet_preference`, `exclude_allergens`, `meal_count_per_day`, `fasting_enabled`, `is_active`, `deleted_at`; tabel baru `meal_plan_items`

### Migration 3 — EXERCISE
- Tabel baru: `exercises`, `workout_plans`, `workout_plan_items`, `workout_log_items`
- Extend `workout_sessions` (alias `workout_logs`): `started_at`, `completed_at`, `log_date`, `total_sets/reps`, `exercises_completed`, `heart_rate_avg/max/min`, `difficulty_rating`, `perceived_exertion`, `mood_before/after`, `source`, `deleted_at`, `workout_plan_id`
- Extend `daily_steps`: `distance_km`, `active_minutes`, `floors_climbed`, `calories_burned`

### Migration 4 — FASTING & BODY
- Extend `fasting_sessions`: `planned_duration_hours`, `planned_end_at`, `status` (enum-ish), `actual_duration_hours`, `imsak_time`, `iftar_time`, `sahur_logged`, `iftar_logged`, `water_intake_ml`, `energy_level_start/end`, `hunger_level_avg`, `mood_during`, `break_reason`
- Tabel baru: `fasting_schedules`, `body_metrics`

### Migration 5 — WELLNESS & AI
- Extend `water_logs`: `water_type`, `log_date`, `source`
- Extend `mood_logs`: `energy_level`, `stress_level`, `anxiety_level`, `mood_label`, `triggers JSONB`, `log_date`
- Extend `sleep_logs`: `bed_time`, `wake_time`, `log_date`, `duration_hours`, `quality_score`, `time_to_sleep_min`, `interruptions`, `deep/light/rem_hours`, `pre_sleep_activities`, `source`
- Tabel baru: `chat_sessions` (group `chat_messages`), `ai_reports`
- Extend `chat_messages`: `session_id`, `content_type`, `image_url`, `audio_url`, `model_used`, `tokens_used`, `suggestions JSONB`, `user_rating`, `is_helpful`, `was_flagged`

### Migration 6 — CONTENT & COMMUNITY
- Tabel baru: `articles`, `article_bookmarks`
- Extend `community_posts`: `post_type`, `image_urls JSONB`, `video_url`, `tags JSONB`, `likes/comments/shares/views_count`, `is_flagged`, `is_approved`, `is_pinned`, `is_featured`, `deleted_at`
- Tabel baru: `community_groups`, `group_members` (atau alias ke `friend_groups`); `post_likes` (alias `community_likes`), `post_comments` parent_comment_id

### Migration 7 — GAMIFICATION
- Extend `achievements`: `name_en`, `badge_url`, `rarity`, `coin_reward`, `condition_type`, `condition_value`, `condition_metadata`, `is_hidden`, `times_unlocked`
- Tabel baru: `xp_logs`, `challenges`, `challenge_participants`, `challenge_daily_logs`

### Migration 8 — NOTIFICATIONS & PRAYER
- Tabel baru: `notifications`, `notification_preferences`, `prayer_times`

### Migration 9 — SUBSCRIPTION & PAYMENT
- Tabel baru: `subscription_plans`, `user_subscriptions`, `payment_history`

### Migration 10 — REFERRAL, REWARDS, PET, ANALYTICS, CONFIG
- Tabel baru: `referrals`, `reward_transactions`, `coin_rewards`, `coin_redemptions`, `virtual_pets`, `pet_interactions`, `search_history`, `user_activity_log`, `system_settings`, `app_versions`

## Aturan eksekusi tiap migration

1. Setiap `CREATE TABLE public.X` diikuti `GRANT SELECT,INSERT,UPDATE,DELETE TO authenticated`, `GRANT ALL TO service_role`, `ENABLE RLS`, dan policy `auth.uid() = user_id` (atau public read untuk content).
2. Triggers global: pakai `public.update_updated_at_column()` yang sudah perlu dibuat di Migration 1.
3. Index pada FK + (`user_id`, `log_date`/`logged_at`).
4. **Tidak ada DROP** apa pun. Kolom baru semua nullable atau ber-default.
5. **Tidak ada perubahan `auth/storage/realtime/vault/supabase_functions` schemas.**

## Yang TIDAK termasuk

- Timescaledb / pg_trgm extension (Supabase managed — pg_trgm OK, timescaledb tidak tersedia, akan di-skip).
- Materialized views (`mv_*`) — akan ditambah di migration terpisah setelah skema stabil, butuh refresh strategy.
- ENUM types Postgres native — pakai `TEXT` + CHECK constraint (lebih fleksibel + tidak rusak saat enum value bertambah).
- Update kode TS/React — hanya migration SQL. Wiring kode menyusul saat fitur dipakai.

## Execution order

Saya akan submit **Migration 1 dulu** (CORE + profile extend + helper function `update_updated_at_column`). Setelah Anda approve & run, saya lanjut Migration 2, dst. Pendekatan ini aman karena tiap migration kecil & isolated.

## Saran lanjutan setelah semua 10 migration jalan

- Wire kolom baru `profiles.bmi/bmr/tdee` ke onboarding form & auto-compute trigger
- Hidupkan `meal_log_items` granular (split meal jadi item) di halaman `/food`
- Build halaman `/challenges` pakai tabel baru
- Build halaman `/articles` + bookmark
- Build `/pet` virtual pet
- Build `/subscription` paywall

Mau saya mulai submit Migration 1?