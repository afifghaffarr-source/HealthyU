import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ---------- Friend invite ----------
export const createFriendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = crypto.randomUUID().slice(0, 12);
    const { data, error } = await context.supabase
      .from("friend_invites")
      .insert({ inviter_id: context.userId, token })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { invite: data };
  });

export const redeemFriendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(6).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("friend_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !inv) throw new Error("Token tidak valid");
    if (inv.inviter_id === context.userId) throw new Error("Tidak bisa redeem sendiri");
    if (inv.used_by) throw new Error("Token sudah dipakai");
    await context.supabase
      .from("friend_invites")
      .update({ used_by: context.userId, used_at: new Date().toISOString() })
      .eq("id", inv.id);
    // create mutual follow
    return { ok: true, inviter: inv.inviter_id };
  });

// ---------- Theme preferences ----------
export const upsertThemePref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        mode: z.enum(["auto", "light", "dark"]),
        lat: z.number().optional(),
        lon: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("theme_preferences")
      .upsert(
        {
          user_id: context.userId,
          mode: data.mode,
          sunset_lat: data.lat ?? null,
          sunset_lon: data.lon ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { pref: row };
  });

export const getThemePref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("theme_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { pref: data };
  });

// ---------- Voice transcript (Gemini audio) ----------
export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        audioBase64: z.string().min(10),
        mimeType: z.string().default("audio/webm"),
        source: z.string().default("mood"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = await callAiWithGuards({
      userId: context.userId,
      feature: "voice.transcribe",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transkripsikan audio bahasa Indonesia berikut secara ringkas. Jawab teks transkrip saja.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: data.audioBase64,
                format: data.mimeType.split("/")[1] ?? "webm",
              },
            },
          ],
        },
      ],
    });
    const transcript = text.trim();
    const { data: row, error } = await context.supabase
      .from("voice_transcripts")
      .insert({
        user_id: context.userId,
        source: data.source,
        transcript,
        metadata: { mimeType: data.mimeType } as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { transcript, record: row };
  });

// ---------- AI exercise recommendation ----------
export const recommendExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ goal: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const text = await callAiWithGuards({
      userId,
      feature: "exercises.recommend",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Kamu coach fitness Indonesia. Jawab JSON array {name, sets, reps, rationale}.",
        },
        {
          role: "user",
          content: `Goal user: ${data.goal}. Berikan 5 latihan praktis di rumah, format JSON.`,
        },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    let plan: Record<string, string | number>[] = [];
    try {
      plan = JSON.parse(m ? m[0] : "[]");
    } catch {
      plan = [];
    }
    return { plan };
  });

// ---------- Story photo signed upload helper ----------
export const createStoryPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        filename: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9._-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/stories/${Date.now()}-${data.filename}`;
    const { data: signed, error } = await context.supabase.storage
      .from("scan-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });
