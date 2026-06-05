import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const DailyChallengeSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    goal_type: z.string().optional(),
    goal_value: z.number().optional(),
  })
  ;

// ============ 9: Streak Freeze ============
export const useStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins, streak_freeze_used_at, last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if ((prof.health_coins ?? 0) < 30) throw new Error("Coin tidak cukup (butuh 30)");
    if (prof.streak_freeze_used_at === today) throw new Error("Sudah dipakai hari ini");
    await supabase
      .from("profiles")
      .update({
        health_coins: (prof.health_coins ?? 0) - 30,
        streak_freeze_used_at: today,
        last_scan_date: today,
      })
      .eq("id", userId);
    return { ok: true, streak: prof.scan_streak_current };
  });

// ============ 3: Group scan leaderboard ============
export const getGroupScanLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string }) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: members } = await supabase
      .from("friend_group_members")
      .select(
        "user_id, profiles(id, full_name, avatar_url, public_profile, scan_streak_current)",
      )
      .eq("group_id", data.groupId);
    const rows: Array<{
      userId: string;
      name: string;
      avatar: string | null;
      streak: number;
      scans: number;
    }> = [];
    type MemberWithProfile = {
      user_id: string;
      profiles?: {
        id?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
        public_profile?: boolean | null;
        scan_streak_current?: number | null;
      } | null;
    };
    const { maskPublicProfile, ANON_NAME } = await import("@/lib/privacy");
    for (const m of (members ?? []) as MemberWithProfile[]) {
      const { count } = await supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", m.user_id)
        .gte("created_at", since);
      const masked = maskPublicProfile(
        m.profiles ? { ...m.profiles, id: m.profiles.id ?? m.user_id } : null,
        userId,
      );
      rows.push({
        userId: m.user_id,
        name: masked?.full_name ?? ANON_NAME,
        avatar: masked?.avatar_url ?? null,
        streak: m.profiles?.scan_streak_current ?? 0,
        scans: count ?? 0,
      });
    }
    rows.sort((a, b) => b.scans - a.scans || b.streak - a.streak);
    return { rows };
  });

// ============ 6: Reverse calorie ============
export const reverseCalorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetCalories: number }) =>
    z.object({ targetCalories: z.number().min(50).max(3000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await callAiWithGuards({
      userId: null,
      feature: "social.reverse_calorie",
      skipBudget: true,
      messages: [
        {
          role: "system",
          content:
            "Kamu ahli gizi Indonesia. Berikan 5 saran makanan/menu yang totalnya mendekati target kalori. Format JSON array: [{name, calories, protein_g, carbs_g, fat_g, why}].",
        },
        { role: "user", content: `Target ${data.targetCalories} kkal. Berikan opsi praktis.` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    type Suggestion = {
      name: string;
      calories: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      why?: string;
    };
    let suggestions: Suggestion[] = [];
    try {
      const parsed = m ? JSON.parse(m[0]) : [];
      suggestions = Array.isArray(parsed) ? (parsed as Suggestion[]) : [];
    } catch {}
    return { suggestions };
  });

// ============ 8: Daily AI challenge ============
export const getDailyChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("ai_daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .maybeSingle();
    if (existing) return { challenge: existing };
    const fallback = {
      title: "Minum 8 gelas air",
      description: "Hidrasi penuh",
      goal_type: "water_ml",
      goal_value: 2000,
    };
    type DailyChallenge = z.infer<typeof DailyChallengeSchema>;
    let parsed: DailyChallenge = { ...fallback };
    try {
      parsed = await callAiJsonWithSchema({
        userId,
        feature: "challenge.daily.generate",
        schema: DailyChallengeSchema,
        fallback,
        messages: [
          {
            role: "system",
            content:
              "Buat 1 mini challenge nutrisi harian (bahasa Indonesia, singkat & realistis). JSON: {title, description, goal_type, goal_value}. goal_type: 'water_ml'|'protein_g'|'veggies_servings'|'scan_count'|'steps'.",
          },
          { role: "user", content: "Tantangan hari ini" },
        ],
      });
      if (!parsed?.title) parsed = fallback;
    } catch {}
    const { data: created } = await supabase
      .from("ai_daily_challenges")
      .insert({
        user_id: userId,
        challenge_date: today,
        title: parsed.title ?? fallback.title,
        description: parsed.description ?? fallback.description,
        goal_type: parsed.goal_type ?? fallback.goal_type,
        goal_value: parsed.goal_value ?? fallback.goal_value,
      })
      .select()
      .single();
    return { challenge: created };
  });
