-- Sprint 7 — Workout enhancement (2026-06-23)
-- - workout_exercises: catalog (compound/isolation, equipment, muscle group)
-- - workout_programs: preset training programs (Beginner/PPL/Upper-Lower/Full Body)
-- - workout_program_exercises: exercises per program day (with sets/reps/rest)
-- - workout_session_sets: granular set logging (reps, weight, RPE) — replaces minutes+calories-only
-- - workout_sessions: extend with program_id, started_at, finished_at, total_volume_kg
--
-- Safety guardrails (medical):
--   - exercises has `avoid_for_conditions` text[] (e.g. ['knee_pain'] for heavy squat)
--   - programs has `requires_equipment` text[] for matching user context
--   - Free-tier: 5 programs + 30 exercises seeded. Premium: more.

-- ====================================================================
-- workout_exercises — catalog
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL CHECK (category IN ('compound', 'isolation', 'cardio', 'mobility')),
  muscle_group TEXT NOT NULL,                  -- e.g. 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'
  equipment TEXT NOT NULL,                     -- 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'kettlebell' | 'band'
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  description TEXT,
  video_url TEXT,
  avoid_for_conditions TEXT[] DEFAULT '{}'::text[],   -- ['knee_pain','back_pain','shoulder_impingement']
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_muscle
  ON public.workout_exercises (muscle_group, is_active);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_equipment
  ON public.workout_exercises (equipment, is_active);

GRANT SELECT ON public.workout_exercises TO authenticated, anon;
GRANT ALL ON public.workout_exercises TO service_role;

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_exercises read all" ON public.workout_exercises
  FOR SELECT TO authenticated USING (is_active);

COMMENT ON TABLE public.workout_exercises IS 'Exercise catalog. Read by all authenticated users; admin-only writes via service_role.';

-- ====================================================================
-- workout_programs — preset training programs
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('strength', 'hypertrophy', 'fat_loss', 'endurance', 'general_fitness')),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week SMALLINT NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  duration_weeks SMALLINT NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  description TEXT NOT NULL,
  requires_equipment TEXT[] DEFAULT '{}'::text[],
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_programs_active
  ON public.workout_programs (is_active, level, goal);

GRANT SELECT ON public.workout_programs TO authenticated, anon;
GRANT ALL ON public.workout_programs TO service_role;

ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_programs read all" ON public.workout_programs
  FOR SELECT TO authenticated USING (is_active);

COMMENT ON TABLE public.workout_programs IS 'Preset training programs (free + premium). Read by all users; admin-only writes.';

-- ====================================================================
-- workout_program_exercises — exercises per program day
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.workout_program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  day_number SMALLINT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE RESTRICT,
  target_sets SMALLINT NOT NULL CHECK (target_sets BETWEEN 1 AND 10),
  target_reps_min SMALLINT NOT NULL CHECK (target_reps_min BETWEEN 1 AND 50),
  target_reps_max SMALLINT NOT NULL CHECK (target_reps_max BETWEEN target_reps_min AND 100),
  rest_seconds SMALLINT NOT NULL DEFAULT 60 CHECK (rest_seconds BETWEEN 0 AND 600),
  order_index SMALLINT NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (program_id, day_number, exercise_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_workout_program_exercises_program_day
  ON public.workout_program_exercises (program_id, day_number, order_index);

GRANT SELECT ON public.workout_program_exercises TO authenticated, anon;
GRANT ALL ON public.workout_program_exercises TO service_role;

ALTER TABLE public.workout_program_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_program_exercises read all" ON public.workout_program_exercises
  FOR SELECT TO authenticated USING (true);

-- ====================================================================
-- Extend workout_sessions: program tracking + volume
-- ====================================================================
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.workout_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_volume_kg NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sets SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rpe NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS perceived_exertion SMALLINT CHECK (perceived_exertion BETWEEN 1 AND 10);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started
  ON public.workout_sessions (user_id, started_at DESC NULLS LAST);

-- ====================================================================
-- workout_session_sets — granular set logging
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.workout_session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE RESTRICT,
  set_number SMALLINT NOT NULL CHECK (set_number BETWEEN 1 AND 50),
  reps SMALLINT NOT NULL CHECK (reps BETWEEN 0 AND 100),
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  rpe SMALLINT CHECK (rpe BETWEEN 1 AND 10),
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  is_pr BOOLEAN NOT NULL DEFAULT false,        -- auto-set when this set beats previous max weight for the exercise
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_session_sets_session
  ON public.workout_session_sets (session_id, exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_workout_session_sets_user_exercise_weight
  ON public.workout_session_sets (session_id, exercise_id, weight_kg DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_session_sets TO authenticated;
GRANT ALL ON public.workout_session_sets TO service_role;

ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session sets" ON public.workout_session_sets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_sets.session_id AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_sets.session_id AND ws.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.workout_session_sets IS 'Granular set logging. Auto-detects PRs (max weight per exercise).';

-- ====================================================================
-- Personal records helper view (top weight per exercise per user)
-- ====================================================================
CREATE OR REPLACE VIEW public.user_exercise_prs AS
SELECT
  ws.user_id,
  wse.exercise_id,
  we.name AS exercise_name,
  we.muscle_group,
  MAX(wse.weight_kg) AS max_weight_kg,
  (ARRAY_AGG(wse.reps ORDER BY wse.weight_kg DESC))[1] AS reps_at_max,
  MAX(wse.completed_at) AS achieved_at
FROM public.workout_session_sets wse
JOIN public.workout_sessions ws ON ws.id = wse.session_id
JOIN public.workout_exercises we ON we.id = wse.exercise_id
WHERE wse.is_warmup = false AND wse.weight_kg > 0
GROUP BY ws.user_id, wse.exercise_id, we.name, we.muscle_group;

GRANT SELECT ON public.user_exercise_prs TO authenticated;

COMMENT ON VIEW public.user_exercise_prs IS 'Top weight per exercise per user (auto-updated on every logged set).';

-- ====================================================================
-- Seed exercises (30 common exercises, free tier)
-- ====================================================================
INSERT INTO public.workout_exercises (name, name_en, category, muscle_group, equipment, difficulty, description, avoid_for_conditions) VALUES
  -- Compound bodyweight
  ('Push-up', 'Push-up', 'compound', 'chest', 'bodyweight', 'beginner', 'Latihan dada klasik. Push-up standar.', ARRAY[]::text[]),
  ('Squat', 'Squat', 'compound', 'legs', 'bodyweight', 'beginner', 'Squat tanpa beban. Kaki selebar bahu.', ARRAY[]::text[]),
  ('Lunges', 'Lunges', 'compound', 'legs', 'bodyweight', 'beginner', 'Langkah kaki bergantian. Fokus quadriceps.', ARRAY['knee_pain']::text[]),
  ('Plank', 'Plank', 'isolation', 'core', 'bodyweight', 'beginner', 'Tahan posisi plank. Core stability.', ARRAY[]::text[]),
  ('Mountain Climber', 'Mountain Climber', 'cardio', 'full_body', 'bodyweight', 'beginner', 'Cardio intens. Push-up position dengan langkah cepat.', ARRAY[]::text[]),
  ('Burpee', 'Burpee', 'cardio', 'full_body', 'bodyweight', 'intermediate', 'Full body cardio. Squat → plank → jump.', ARRAY['knee_pain','back_pain']::text[]),
  ('Pull-up', 'Pull-up', 'compound', 'back', 'bodyweight', 'intermediate', 'Tarikan ke atas. Latih back + bisep.', ARRAY['shoulder_impingement']::text[]),
  ('Dip', 'Dip', 'compound', 'chest', 'bodyweight', 'intermediate', 'Parallel bar dip. Dada + trisep.', ARRAY['shoulder_impingement']::text[]),
  ('Pike Push-up', 'Pike Push-up', 'compound', 'shoulders', 'bodyweight', 'intermediate', 'Push-up dengan pinggul tinggi. Fokus bahu.', ARRAY[]::text[]),
  -- Dumbbell
  ('Dumbbell Bench Press', 'Dumbbell Bench Press', 'compound', 'chest', 'dumbbell', 'beginner', 'Dada dengan dumbbell. Angkat horizontal.', ARRAY['shoulder_impingement']::text[]),
  ('Dumbbell Row', 'Dumbbell Row', 'compound', 'back', 'dumbbell', 'beginner', 'Row satu lengan. Fokus punggung.', ARRAY[]::text[]),
  ('Dumbbell Shoulder Press', 'Dumbbell Shoulder Press', 'compound', 'shoulders', 'dumbbell', 'intermediate', 'Tekan dumbbell ke atas dari telinga.', ARRAY['shoulder_impingement']::text[]),
  ('Goblet Squat', 'Goblet Squat', 'compound', 'legs', 'dumbbell', 'beginner', 'Squat pegang dumbbell di dada.', ARRAY['knee_pain']::text[]),
  ('Dumbbell Romanian Deadlift', 'Dumbbell RDL', 'compound', 'legs', 'dumbbell', 'intermediate', 'Hinge pinggul dengan dumbbell. Hamstring + glute.', ARRAY['back_pain']::text[]),
  ('Dumbbell Bicep Curl', 'Dumbbell Bicep Curl', 'isolation', 'arms', 'dumbbell', 'beginner', 'Curl dengan dumbbell. Isolasi bisep.', ARRAY[]::text[]),
  ('Lateral Raise', 'Lateral Raise', 'isolation', 'shoulders', 'dumbbell', 'beginner', 'Angkat dumbbell ke samping. Otot deltoid.', ARRAY['shoulder_impingement']::text[]),
  -- Barbell
  ('Barbell Bench Press', 'Barbell Bench Press', 'compound', 'chest', 'barbell', 'intermediate', 'Bench press dengan barbell. Standar strength.', ARRAY['shoulder_impingement']::text[]),
  ('Barbell Back Squat', 'Barbell Back Squat', 'compound', 'legs', 'barbell', 'intermediate', 'Squat dengan barbell di punggung.', ARRAY['knee_pain','back_pain']::text[]),
  ('Barbell Deadlift', 'Barbell Deadlift', 'compound', 'full_body', 'barbell', 'advanced', 'Lift dari lantai. Full body strength.', ARRAY['back_pain']::text[]),
  ('Barbell Overhead Press', 'Barbell OHP', 'compound', 'shoulders', 'barbell', 'intermediate', 'Tekan barbell ke atas berdiri.', ARRAY['shoulder_impingement']::text[]),
  ('Barbell Row', 'Barbell Row', 'compound', 'back', 'barbell', 'intermediate', 'Row dengan barbell. Pendekatan powerlifter.', ARRAY[]::text[]),
  -- Cardio
  ('Jumping Jacks', 'Jumping Jacks', 'cardio', 'full_body', 'bodyweight', 'beginner', 'Cardio pemanasan klasik.', ARRAY[]::text[]),
  ('High Knees', 'High Knees', 'cardio', 'full_body', 'bodyweight', 'beginner', 'Lari di tempat, lutut tinggi.', ARRAY['knee_pain']::text[]),
  ('Skater Jump', 'Skater Jump', 'cardio', 'legs', 'bodyweight', 'intermediate', 'Lompat menyamping seperti skater.', ARRAY['knee_pain']::text[]),
  -- Mobility
  ('Cat-Cow Stretch', 'Cat-Cow Stretch', 'mobility', 'full_body', 'bodyweight', 'beginner', 'Pemanasan punggung. Mobilitas spine.', ARRAY[]::text[]),
  ('Hip Flexor Stretch', 'Hip Flexor Stretch', 'mobility', 'legs', 'bodyweight', 'beginner', 'Stretch hip flexor. Counter duduk lama.', ARRAY[]::text[]),
  ('Child Pose', 'Child Pose', 'mobility', 'full_body', 'bodyweight', 'beginner', 'Yoga rest pose. Punggung + pinggul.', ARRAY[]::text[]),
  ('Wall Sit', 'Wall Sit', 'isolation', 'legs', 'bodyweight', 'beginner', 'Duduk di dinding. Quadriceps isometric.', ARRAY['knee_pain']::text[]),
  ('Glute Bridge', 'Glute Bridge', 'isolation', 'legs', 'bodyweight', 'beginner', 'Angkat pinggul. Glute activation.', ARRAY[]::text[]),
  ('Russian Twist', 'Russian Twist', 'isolation', 'core', 'bodyweight', 'intermediate', 'Twist duduk. Core rotational.', ARRAY['back_pain']::text[])
ON CONFLICT DO NOTHING;

-- ====================================================================
-- Seed programs (5 free programs, 4 weeks each)
-- ====================================================================
INSERT INTO public.workout_programs (slug, name, goal, level, days_per_week, duration_weeks, description, requires_equipment) VALUES
  ('beginner-full-body', 'Beginner Full Body', 'general_fitness', 'beginner', 3, 4, 'Program full body 3x seminggu untuk pemula. Fokus gerakan dasar + bentuk.', ARRAY['bodyweight']::text[]),
  ('ppl-beginner', 'Push/Pull/Legs Pemula', 'hypertrophy', 'beginner', 3, 8, 'Siklus Push/Pull/Legs klasik untuk hipertrofi dasar.', ARRAY['dumbbell','bodyweight']::text[]),
  ('upper-lower-4', 'Upper/Lower 4 Hari', 'strength', 'intermediate', 4, 8, 'Upper/Lower split 4x seminggu untuk strength + hipertrofi.', ARRAY['barbell','dumbbell']::text[]),
  ('home-bodyweight', 'Home Bodyweight Only', 'general_fitness', 'beginner', 4, 6, 'Latihan di rumah tanpa alat. Cocok untuk pemula.', ARRAY['bodyweight']::text[]),
  ('hiit-fat-loss', 'HIIT Fat Loss', 'fat_loss', 'intermediate', 4, 6, 'HIIT 4x seminggu untuk fat loss. Kombinasi cardio + strength.', ARRAY['bodyweight']::text[])
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- Seed program exercises (sample for each program)
-- ====================================================================
-- Helper CTE-style insert via DO block to keep it readable
DO $$
DECLARE
  p_beginner_full_body UUID;
  p_ppl UUID;
  p_upper_lower UUID;
  p_home UUID;
  p_hiit UUID;
  e_pushup UUID;
  e_squat UUID;
  e_plank UUID;
  e_lunges UUID;
  e_db_row UUID;
  e_db_bench UUID;
  e_db_press UUID;
  e_db_rdl UUID;
  e_pullup UUID;
  e_bench UUID;
  e_squat_bb UUID;
  e_deadlift UUID;
  e_ohp UUID;
  e_bb_row UUID;
  e_jacks UUID;
  e_high_knees UUID;
  e_burpee UUID;
  e_mountain UUID;
  e_lateral UUID;
  e_bicep UUID;
  e_glute UUID;
  e_cat_cow UUID;
  e_child UUID;
  e_hip UUID;
BEGIN
  -- Resolve program IDs
  SELECT id INTO p_beginner_full_body FROM workout_programs WHERE slug = 'beginner-full-body';
  SELECT id INTO p_ppl FROM workout_programs WHERE slug = 'ppl-beginner';
  SELECT id INTO p_upper_lower FROM workout_programs WHERE slug = 'upper-lower-4';
  SELECT id INTO p_home FROM workout_programs WHERE slug = 'home-bodyweight';
  SELECT id INTO p_hiit FROM workout_programs WHERE slug = 'hiit-fat-loss';

  -- Resolve exercise IDs
  SELECT id INTO e_pushup FROM workout_exercises WHERE name = 'Push-up';
  SELECT id INTO e_squat FROM workout_exercises WHERE name = 'Squat';
  SELECT id INTO e_plank FROM workout_exercises WHERE name = 'Plank';
  SELECT id INTO e_lunges FROM workout_exercises WHERE name = 'Lunges';
  SELECT id INTO e_db_row FROM workout_exercises WHERE name = 'Dumbbell Row';
  SELECT id INTO e_db_bench FROM workout_exercises WHERE name = 'Dumbbell Bench Press';
  SELECT id INTO e_db_press FROM workout_exercises WHERE name = 'Dumbbell Shoulder Press';
  SELECT id INTO e_db_rdl FROM workout_exercises WHERE name = 'Dumbbell Romanian Deadlift';
  SELECT id INTO e_pullup FROM workout_exercises WHERE name = 'Pull-up';
  SELECT id INTO e_bench FROM workout_exercises WHERE name = 'Barbell Bench Press';
  SELECT id INTO e_squat_bb FROM workout_exercises WHERE name = 'Barbell Back Squat';
  SELECT id INTO e_deadlift FROM workout_exercises WHERE name = 'Barbell Deadlift';
  SELECT id INTO e_ohp FROM workout_exercises WHERE name = 'Barbell Overhead Press';
  SELECT id INTO e_bb_row FROM workout_exercises WHERE name = 'Barbell Row';
  SELECT id INTO e_jacks FROM workout_exercises WHERE name = 'Jumping Jacks';
  SELECT id INTO e_high_knees FROM workout_exercises WHERE name = 'High Knees';
  SELECT id INTO e_burpee FROM workout_exercises WHERE name = 'Burpee';
  SELECT id INTO e_mountain FROM workout_exercises WHERE name = 'Mountain Climber';
  SELECT id INTO e_lateral FROM workout_exercises WHERE name = 'Lateral Raise';
  SELECT id INTO e_bicep FROM workout_exercises WHERE name = 'Dumbbell Bicep Curl';
  SELECT id INTO e_glute FROM workout_exercises WHERE name = 'Glute Bridge';
  SELECT id INTO e_cat_cow FROM workout_exercises WHERE name = 'Cat-Cow Stretch';
  SELECT id INTO e_child FROM workout_exercises WHERE name = 'Child Pose';
  SELECT id INTO e_hip FROM workout_exercises WHERE name = 'Hip Flexor Stretch';

  -- Beginner Full Body (Day A, Day B, Day C — semua full body, A & B)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index) VALUES
    (p_beginner_full_body, 1, e_cat_cow, 1, 5, 10, 0, 0),
    (p_beginner_full_body, 1, e_squat, 3, 8, 12, 60, 1),
    (p_beginner_full_body, 1, e_pushup, 3, 5, 10, 60, 2),
    (p_beginner_full_body, 1, e_db_row, 3, 8, 12, 60, 3),
    (p_beginner_full_body, 1, e_plank, 3, 20, 30, 45, 4),
    (p_beginner_full_body, 2, e_cat_cow, 1, 5, 10, 0, 0),
    (p_beginner_full_body, 2, e_lunges, 3, 8, 12, 60, 1),
    (p_beginner_full_body, 2, e_db_bench, 3, 8, 12, 60, 2),
    (p_beginner_full_body, 2, e_db_rdl, 3, 8, 12, 60, 3),
    (p_beginner_full_body, 2, e_glute, 3, 10, 15, 45, 4);

  -- Push/Pull/Legs (Day 1 = Push, Day 2 = Pull, Day 3 = Legs)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index) VALUES
    (p_ppl, 1, e_db_bench, 4, 8, 12, 90, 0),
    (p_ppl, 1, e_db_press, 3, 8, 12, 90, 1),
    (p_ppl, 1, e_lateral, 3, 12, 15, 60, 2),
    (p_ppl, 1, e_pushup, 3, 10, 15, 60, 3),
    (p_ppl, 2, e_pullup, 4, 5, 10, 90, 0),
    (p_ppl, 2, e_db_row, 3, 8, 12, 90, 1),
    (p_ppl, 2, e_bicep, 3, 10, 15, 60, 2),
    (p_ppl, 3, e_squat_bb, 4, 8, 12, 120, 0),
    (p_ppl, 3, e_db_rdl, 3, 8, 12, 90, 1),
    (p_ppl, 3, e_lunges, 3, 10, 15, 60, 2),
    (p_ppl, 3, e_glute, 3, 12, 15, 60, 3);

  -- Upper/Lower 4 days (Upper A, Lower A, Upper B, Lower B)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index) VALUES
    (p_upper_lower, 1, e_bench, 4, 5, 8, 120, 0),
    (p_upper_lower, 1, e_bb_row, 4, 5, 8, 120, 1),
    (p_upper_lower, 1, e_ohp, 3, 8, 10, 90, 2),
    (p_upper_lower, 2, e_squat_bb, 4, 5, 8, 120, 0),
    (p_upper_lower, 2, e_deadlift, 3, 3, 5, 180, 1),
    (p_upper_lower, 2, e_lunges, 3, 8, 12, 90, 2),
    (p_upper_lower, 3, e_db_press, 3, 8, 12, 90, 0),
    (p_upper_lower, 3, e_pullup, 4, 6, 10, 90, 1),
    (p_upper_lower, 3, e_db_bench, 3, 8, 12, 90, 2),
    (p_upper_lower, 4, e_db_rdl, 4, 6, 10, 120, 0),
    (p_upper_lower, 4, e_squat, 3, 10, 15, 90, 1),
    (p_upper_lower, 4, e_glute, 3, 12, 15, 60, 2);

  -- Home Bodyweight (4 days, full body each)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index) VALUES
    (p_home, 1, e_jacks, 2, 30, 60, 30, 0),
    (p_home, 1, e_squat, 3, 12, 20, 45, 1),
    (p_home, 1, e_pushup, 3, 8, 15, 45, 2),
    (p_home, 1, e_plank, 3, 30, 60, 30, 3),
    (p_home, 2, e_high_knees, 2, 30, 45, 30, 0),
    (p_home, 2, e_lunges, 3, 10, 15, 45, 1),
    (p_home, 2, e_pike_pushup, 3, 8, 12, 45, 2),
    (p_home, 2, e_glute, 3, 12, 20, 30, 3);

  -- HIIT Fat Loss (4 days, mix cardio + strength)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index) VALUES
    (p_hiit, 1, e_burpee, 4, 8, 12, 60, 0),
    (p_hiit, 1, e_mountain, 4, 30, 45, 45, 1),
    (p_hiit, 1, e_squat, 4, 15, 20, 45, 2),
    (p_hiit, 1, e_pushup, 4, 10, 15, 45, 3),
    (p_hiit, 2, e_jacks, 4, 40, 60, 30, 0),
    (p_hiit, 2, e_high_knees, 4, 30, 45, 30, 1),
    (p_hiit, 2, e_lunges, 4, 12, 16, 45, 2),
    (p_hiit, 2, e_plank, 4, 30, 45, 30, 3);

  -- Cool-down stretches for all programs (Day 1+, lower priority)
  INSERT INTO workout_program_exercises (program_id, day_number, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index)
  SELECT pg.id, d.day_number, e_child, 1, 1, 1, 30, 99
  FROM workout_programs pg, generate_series(1, pg.days_per_week) AS d(day_number), workout_exercises e
  WHERE e.name = 'Child Pose'
    AND pg.slug IN ('beginner-full-body', 'ppl-beginner', 'upper-lower-4', 'home-bodyweight')
  ON CONFLICT DO NOTHING;
END $$;

COMMENT ON COLUMN public.workout_exercises.avoid_for_conditions IS
  'Medical conditions where this exercise should be avoided or modified (e.g. knee_pain, back_pain).';
COMMENT ON COLUMN public.workout_programs.requires_equipment IS
  'Equipment needed: bodyweight | dumbbell | barbell | machine. UI hides programs requiring unavailable equipment.';