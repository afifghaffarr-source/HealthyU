import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Theme preferences (light/dark/auto + sunset geo) =====

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

// ===== Friend invite (token-based) =====

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
    return { ok: true, inviter: inv.inviter_id };
  });
