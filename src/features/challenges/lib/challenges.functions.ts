import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeLogServerError } from "@/lib/logSafe";

export const listChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ch, mine] = await Promise.all([
      supabase
        .from("challenges")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(50),
      supabase.from("challenge_participants").select("*").eq("user_id", userId),
    ]);
    return {
      challenges: ch.data ?? [],
      participations: mine.data ?? [],
    };
  });

const JoinSchema = z.object({ challenge_id: z.string().uuid() });

export const joinChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => JoinSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("challenge_participants")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", data.challenge_id)
      .maybeSingle();
    if (existing) return { id: existing.id, already: true };
    const { data: inserted, error } = await supabase
      .from("challenge_participants")
      .insert({ user_id: userId, challenge_id: data.challenge_id, status: "active" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Auto-broadcast to other members of any groups this user shares which already
    // linked this challenge. Fire-and-forget; failures don't block joining.
    try {
      const { broadcastGroupChallengeJoin } = await import("./groupChallengeBroadcast.server");
      await broadcastGroupChallengeJoin({
        userId,
        challengeId: data.challenge_id,
      });
    } catch (e) {
      safeLogServerError("group-broadcast", e).catch(() => {});
    }

    return { id: inserted.id, already: false };
  });

const LogDaySchema = z.object({
  participant_id: z.string().uuid(),
  day_number: z.number().int().min(1),
  value_logged: z.number().optional(),
  notes: z.string().max(500).optional(),
});

export const logChallengeDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LogDaySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: participant } = await supabase
      .from("challenge_participants")
      .select("id, user_id, current_day, streak")
      .eq("id", data.participant_id)
      .maybeSingle();
    if (!participant || participant.user_id !== userId) {
      throw new Error("Not your participation");
    }
    const today = new Date().toISOString().slice(0, 10);
    const { error: logErr } = await supabase.from("challenge_daily_logs").upsert(
      {
        challenge_participant_id: data.participant_id,
        log_date: today,
        day_number: data.day_number,
        value_logged: data.value_logged ?? null,
        notes: data.notes ?? null,
        completed: true,
      },
      { onConflict: "challenge_participant_id,log_date" },
    );
    if (logErr) {
      // table may not have unique constraint — fall back to insert
      await supabase.from("challenge_daily_logs").insert({
        challenge_participant_id: data.participant_id,
        log_date: today,
        day_number: data.day_number,
        value_logged: data.value_logged ?? null,
        notes: data.notes ?? null,
        completed: true,
      });
    }
    const newDay = Math.max(participant.current_day ?? 0, data.day_number);
    const newStreak = (participant.streak ?? 0) + 1;
    await supabase
      .from("challenge_participants")
      .update({
        current_day: newDay,
        streak: newStreak,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.participant_id);
    return { day: newDay, streak: newStreak };
  });

const LeaveSchema = z.object({ participant_id: z.string().uuid() });

export const leaveChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LeaveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("id", data.participant_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
