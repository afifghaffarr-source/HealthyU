/**
 * Sprint 7 — Workout enhancement server functions
 *
 * Provides:
 *  - getExerciseCatalog           → list exercises (filter by muscle/equipment)
 *  - getWorkoutPrograms           → list preset programs (filter by goal/level)
 *  - getProgramDays               → exercises for a program day
 *  - startWorkoutSession          → begin session (returns session_id, optionally linked to program)
 *  - getActiveSession             → user's in-progress session (if any)
 *  - logWorkoutSet                → log individual set (auto-detect PR)
 *  - finishWorkoutSession         → end session, compute total volume
 *  - deleteWorkoutSession         → remove session + cascade sets
 *  - getPersonalRecords           → top weight per exercise
 *  - getVolumeProgress            → 8-week weekly volume trend
 *  - getWorkoutStreak             → consecutive days with ≥1 workout
 *  - substituteExercise           → AI swap (find similar exercise avoiding medical conditions)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

// ────────────────────────────────────────────────────────────────────
// Exercise catalog
// ────────────────────────────────────────────────────────────────────
const ExerciseFilters = z.object({
  muscle_group: z.string().max(40).optional(),
  equipment: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(200).default(80),
});

export const getExerciseCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExerciseFilters.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("workout_exercises")
      .select(
        "id, name, name_en, category, muscle_group, equipment, difficulty, description, avoid_for_conditions",
      )
      .eq("is_active", true)
      .limit(data.limit);

    if (data.muscle_group) q = q.eq("muscle_group", data.muscle_group);
    if (data.equipment) q = q.eq("equipment", data.equipment);

    const { data: rows, error } = await q.order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ────────────────────────────────────────────────────────────────────
// Programs
// ────────────────────────────────────────────────────────────────────
const ProgramFilters = z.object({
  goal: z.enum(["strength", "hypertrophy", "fat_loss", "endurance", "general_fitness"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const getWorkoutPrograms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ProgramFilters.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("workout_programs")
      .select(
        "id, slug, name, goal, level, days_per_week, duration_weeks, description, requires_equipment, is_premium",
      )
      .eq("is_active", true)
      .order("level");

    if (data.goal) q = q.eq("goal", data.goal);
    if (data.level) q = q.eq("level", data.level);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProgramDay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        program_id: z.string().uuid(),
        day_number: z.number().int().min(1).max(7),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("workout_program_exercises")
      .select(
        "id, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, order_index, notes, exercise:workout_exercises(name, muscle_group, equipment, difficulty, avoid_for_conditions)",
      )
      .eq("program_id", data.program_id)
      .eq("day_number", data.day_number)
      .order("order_index");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ────────────────────────────────────────────────────────────────────
// Active session lifecycle
// ────────────────────────────────────────────────────────────────────
const StartSessionInput = z.object({
  program_id: z.string().uuid().nullable().optional(),
  day_number: z.number().int().min(1).max(7).nullable().optional(),
  type: z
    .enum(["cardio", "strength", "hiit", "yoga", "walking", "cycling", "other"])
    .default("strength"),
  name: z.string().min(1).max(80),
});

export const startWorkoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StartSessionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        type: data.type,
        name: data.name,
        program_id: data.program_id ?? null,
        started_at: now,
        // duration_min default 0 — will be computed at finish
        duration_min: 0,
        calories_burned: 0,
        intensity: "medium",
      } as never)
      .select("id, started_at")
      .single();
    if (error) throw new Error(error.message);
    return { session_id: row.id, started_at: row.started_at, day_number: data.day_number };
  });

export const getActiveSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        "id, type, name, program_id, started_at, finished_at, total_volume_kg, total_sets, intensity",
      )
      .eq("user_id", userId)
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

// ────────────────────────────────────────────────────────────────────
// Log individual set (auto-detect PR)
// ────────────────────────────────────────────────────────────────────
const LogSetInput = z.object({
  session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  set_number: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(100),
  weight_kg: z.number().min(0).max(500).default(0),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  is_warmup: z.boolean().default(false),
  notes: z.string().max(200).nullable().optional(),
});

type LogSetResult = {
  set_id: string;
  is_pr: boolean;
  prev_max_kg: number | null;
};

export const logWorkoutSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LogSetInput.parse(i))
  .handler(async ({ data, context }): Promise<LogSetResult> => {
    const { supabase, userId } = context;

    // 1. Verify session belongs to user
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", data.session_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Sesi tidak ditemukan");

    // 2. PR detection: find previous max weight for this exercise (excluding warmups)
    let prevMax: number | null = null;
    if (data.weight_kg > 0 && !data.is_warmup) {
      const { data: prev } = await supabase
        .from("workout_session_sets")
        .select("weight_kg, session:workout_sessions!inner(user_id)")
        .eq("exercise_id", data.exercise_id)
        .eq("is_warmup", false)
        .eq("session.user_id", userId)
        .gt("weight_kg", 0)
        .order("weight_kg", { ascending: false })
        .limit(1);
      prevMax = prev && prev.length > 0 ? Number(prev[0].weight_kg) : null;
    }
    const is_pr =
      !data.is_warmup && data.weight_kg > 0 && (prevMax === null || data.weight_kg > prevMax);

    // 3. Insert set
    const { data: row, error } = await supabase
      .from("workout_session_sets")
      .insert({
        session_id: data.session_id,
        exercise_id: data.exercise_id,
        set_number: data.set_number,
        reps: data.reps,
        weight_kg: data.weight_kg,
        rpe: data.rpe ?? null,
        is_warmup: data.is_warmup,
        is_pr,
        notes: data.notes ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { set_id: row.id, is_pr, prev_max_kg: prevMax };
  });

export const getSessionSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ session_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("workout_session_sets")
      .select(
        "id, exercise_id, set_number, reps, weight_kg, rpe, is_warmup, is_pr, notes, completed_at, exercise:workout_exercises(name, muscle_group)",
      )
      .eq("session_id", data.session_id)
      .eq("session.user_id", userId)
      .order("completed_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ────────────────────────────────────────────────────────────────────
// Finish session
// ────────────────────────────────────────────────────────────────────
const FinishInput = z.object({
  session_id: z.string().uuid(),
  perceived_exertion: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const finishWorkoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FinishInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Load session + sets
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, started_at, user_id")
      .eq("id", data.session_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Sesi tidak ditemukan");

    const { data: sets } = await supabase
      .from("workout_session_sets")
      .select("reps, weight_kg, rpe, is_warmup")
      .eq("session_id", data.session_id);

    // 2. Compute totals
    const workingSets = (sets ?? []).filter((s) => !s.is_warmup);
    const totalSets = workingSets.length;
    const totalVolume = workingSets.reduce(
      (s, r) => s + Number(r.weight_kg ?? 0) * Number(r.reps ?? 0),
      0,
    );
    const rpeValues = workingSets.map((s) => Number(s.rpe)).filter((r) => !isNaN(r) && r > 0);
    const avgRpe =
      rpeValues.length > 0
        ? Math.round((rpeValues.reduce((s, r) => s + r, 0) / rpeValues.length) * 10) / 10
        : null;

    // 3. Duration
    const startMs = session.started_at ? new Date(session.started_at).getTime() : Date.now();
    const durationMin = Math.max(1, Math.round((Date.now() - startMs) / 60000));

    // 4. Calorie estimate (very rough): METs * weight_kg * hours
    // Avg METs = 6 for strength, 8 for cardio. Use weight=70kg default.
    const est = Math.round((durationMin / 60) * 6 * 70);

    // 5. Update session
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        finished_at: new Date().toISOString(),
        duration_min: durationMin,
        calories_burned: est,
        total_volume_kg: totalVolume,
        total_sets: totalSets,
        avg_rpe: avgRpe,
        perceived_exertion: data.perceived_exertion ?? null,
        notes: data.notes ?? null,
      } as never)
      .eq("id", data.session_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    return {
      ok: true,
      duration_min: durationMin,
      total_volume_kg: Math.round(totalVolume * 100) / 100,
      total_sets: totalSets,
      avg_rpe: avgRpe,
      estimated_calories: est,
    };
  });

// ────────────────────────────────────────────────────────────────────
// PRs + volume + streak
// ────────────────────────────────────────────────────────────────────
export const getPersonalRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(10) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // View already filters by joining workout_sessions.user_id
    const { data: rows, error } = await supabase
      .from("user_exercise_prs")
      .select("exercise_id, exercise_name, muscle_group, max_weight_kg, reps_at_max, achieved_at")
      .eq("user_id", userId)
      .order("max_weight_kg", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getVolumeProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ weeks: z.number().int().min(1).max(26).default(8) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const startMs = Date.now() - data.weeks * 7 * 86400000;
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select("id, finished_at, total_volume_kg, total_sets")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .gte("finished_at", new Date(startMs).toISOString());

    if (error) throw new Error(error.message);

    // Aggregate per ISO week (Monday-start)
    const buckets: Record<string, { volume: number; sets: number; sessions: number }> = {};
    for (const s of sessions ?? []) {
      if (!s.finished_at) continue;
      const d = new Date(s.finished_at);
      const monday = new Date(d);
      const day = monday.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setUTCDate(monday.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      const key = monday.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { volume: 0, sets: 0, sessions: 0 };
      buckets[key].volume += Number(s.total_volume_kg ?? 0);
      buckets[key].sets += Number(s.total_sets ?? 0);
      buckets[key].sessions += 1;
    }

    const result = Object.entries(buckets)
      .map(([week_start, e]) => ({
        week_start,
        volume_kg: Math.round(e.volume),
        total_sets: e.sets,
        sessions: e.sessions,
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    return result;
  });

export const getWorkoutStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ lookback_days: z.number().int().min(7).max(90).default(30) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const lookbackStart = new Date(Date.now() - data.lookback_days * 86400000)
      .toISOString()
      .slice(0, 10);

    const { data: rows } = await supabase
      .from("workout_sessions")
      .select("finished_at")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .gte("finished_at", lookbackStart)
      .lte("finished_at", today + "T23:59:59Z");

    const byDate = new Set<string>();
    for (const r of rows ?? []) {
      if (r.finished_at) byDate.add((r.finished_at as string).slice(0, 10));
    }

    let streak = 0;
    const cursor = new Date(today + "T00:00:00Z");
    for (let i = 0; i < data.lookback_days; i++) {
      const d = cursor.toISOString().slice(0, 10);
      if (!byDate.has(d)) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return { streak, lookback_days: data.lookback_days };
  });

// ────────────────────────────────────────────────────────────────────
// AI substitute exercise (find similar exercise avoiding medical issues)
// ────────────────────────────────────────────────────────────────────
const SubstituteInput = z.object({
  exercise_id: z.string().uuid(),
  reason: z
    .enum(["equipment_missing", "pain", "too_easy", "too_hard"])
    .default("equipment_missing"),
});

const SubstituteResultSchema = z.object({
  substitute_id: z.string().uuid().nullable(),
  reason: z.string().min(1).max(300),
});

export const substituteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SubstituteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Load original exercise + user health conditions
    const [{ data: orig }, { data: profile }] = await Promise.all([
      supabase
        .from("workout_exercises")
        .select("id, name, muscle_group, equipment, category, avoid_for_conditions")
        .eq("id", data.exercise_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("health_conditions, available_equipment")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    if (!orig) throw new Error("Exercise tidak ditemukan");

    const healthConditions = ((profile?.health_conditions ?? []) as string[]).map((s) =>
      s.toLowerCase(),
    );
    const availableEquipment = ((profile?.available_equipment ?? []) as string[]).map((s) =>
      s.toLowerCase(),
    );

    // 2. Find candidates same muscle group + same category + NOT avoiding
    let q = supabase
      .from("workout_exercises")
      .select("id, name, muscle_group, equipment, category, avoid_for_conditions")
      .eq("muscle_group", orig.muscle_group)
      .eq("is_active", true)
      .neq("id", orig.id)
      .limit(40);

    if (data.reason === "equipment_missing" && availableEquipment.length > 0) {
      // Prioritize exercises with available equipment
      q = q.in("equipment", availableEquipment);
    }

    const { data: candidates } = await q;

    // 3. Filter out those with avoid_for_conditions matching user health
    const safe = (candidates ?? []).filter((c) => {
      const avoid = ((c.avoid_for_conditions ?? []) as string[]).map((s) => s.toLowerCase());
      return !avoid.some((a) => healthConditions.includes(a));
    });

    if (safe.length === 0) {
      return {
        substitute: null,
        reason: `Tidak ada alternatif yang cocok untuk ${orig.name} dengan kondisi kesehatan kamu. Coba konsultasikan dengan trainer.`,
      };
    }

    // 4. AI pick best + explain
    const system =
      "Kamu fitness coach Indonesia. Pilih SATU exercise alternatif terbaik dari kandidat " +
      "berdasarkan kategori exercise asal dan alasan user. Pertimbangkan equipment availability dan kondisi medis.\n\n" +
      "OUTPUT JSON: { substitute_id: <uuid atau null>, reason: <penjelasan 1 kalimat> }";

    const user =
      `Exercise asal: ${orig.name} (${orig.category}, ${orig.muscle_group}, ${orig.equipment})\n` +
      `Alasan substitusi: ${data.reason}\n` +
      `Kondisi kesehatan user: ${healthConditions.join(", ") || "tidak ada"}\n` +
      `Equipment tersedia: ${availableEquipment.join(", ") || "tidak diketahui"}\n\n` +
      `Kandidat:\n${safe.map((c) => `- id=${c.id} name="${c.name}" cat=${c.category} eq=${c.equipment}`).join("\n")}`;

    const EMPTY: z.infer<typeof SubstituteResultSchema> = {
      substitute_id: null,
      reason: "",
    };
    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "workout.substitute",
      maxTokens: 300,
      schema: SubstituteResultSchema,
      fallback: EMPTY,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    // Verify AI's pick is in safe list
    const validId = safe.find((c) => c.id === parsed.substitute_id)?.id;

    return {
      substitute: validId
        ? {
            id: validId,
            name: safe.find((c) => c.id === validId)!.name,
            reason: parsed.reason,
          }
        : null,
      reason: parsed.reason,
    };
  });
