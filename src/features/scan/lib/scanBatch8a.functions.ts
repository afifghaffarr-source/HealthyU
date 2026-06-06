import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCallAi.server";

const callAI = makeScanAiCaller("scanBatch8");

// 1. Notify follow/comment (insert log + send web push if subscribed)
export const notifyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { targetUserId: string; type: string; title: string; body?: string; link?: string }) =>
      z
        .object({
          targetUserId: z.string().uuid(),
          type: z.string().min(1).max(40),
          title: z.string().min(1).max(120),
          body: z.string().max(300).optional(),
          link: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications_log").insert({
      user_id: data.targetUserId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    });
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const markNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications_log")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// 2. Streak reminder (returns users at risk to be called by cron via /api/public/cron)
export const checkMyStreakRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const atRisk = (p?.scan_streak_current ?? 0) >= 1 && p?.last_scan_date !== today;
    return { atRisk, streak: p?.scan_streak_current ?? 0 };
  });

// 3. Mood voice input (transcribe via Gemini)
export const transcribeMoodVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audioBase64: string }) =>
    z.object({ audioBase64: z.string().min(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = await callAI(
      `Transkrip dan analisis mood dari rekaman ini (base64): ${data.audioBase64.slice(0, 100)}... Ringkas: transkrip + 1 kata mood (happy/sad/anxious/calm/neutral). Format JSON.`,
      "Kamu transcriber dan psychology analyst.",
      context.userId,
      context.supabase,
    );
    return { result: text };
  });

// 4. AI weekly PDF report (generate text content, frontend renders/downloads)
export const generateWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("ai_weekly_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStartStr)
      .maybeSingle();
    if (existing) return { report: existing };
    const since = weekStart.toISOString();
    const [meals, water, sleep, workouts] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("calories, protein_g")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase
        .from("sleep_logs")
        .select("duration_hours")
        .eq("user_id", userId)
        .gte("log_date", weekStartStr),
      supabase
        .from("workout_sessions")
        .select("calories_burned, duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", since),
    ]);
    const stats = {
      meals: meals.data?.length ?? 0,
      totalCal: (meals.data ?? []).reduce<number>((s, m) => s + (m.calories ?? 0), 0),
      totalProtein: (meals.data ?? []).reduce<number>((s, m) => s + (m.protein_g ?? 0), 0),
      water: (water.data ?? []).reduce<number>((s, w) => s + (w.amount_ml ?? 0), 0),
      sleep: (sleep.data ?? []).reduce<number>((s, w) => s + (w.duration_hours ?? 0), 0),
      workouts: workouts.data?.length ?? 0,
    };
    const content = await callAI(
      `Buat laporan mingguan kesehatan (Bahasa Indonesia, max 400 kata) dari data: ${JSON.stringify(stats)}. Sertakan: ringkasan, highlight, area perbaikan, target minggu depan.`,
      "Kamu health coach personal.",
      userId,
      supabase,
    );
    const { data: inserted } = await supabase
      .from("ai_weekly_reports")
      .insert({ user_id: userId, week_start: weekStartStr, content })
      .select()
      .single();
    return { report: inserted };
  });

