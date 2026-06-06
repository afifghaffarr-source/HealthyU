import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCore.server";

const callAI = makeScanAiCaller("scanBatch8");

// ===== from scanBatch8a (notifyUser, listNotifications, markNotifRead, checkMyStreakRisk, transcribeMoodVoice) =====

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
