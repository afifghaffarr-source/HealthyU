import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const currentFast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      protocol: z.string().max(20),
      target_hours: z.number().min(1).max(72),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // close existing first
    await supabase
      .from("fasting_sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("user_id", userId)
      .is("end_time", null);
    const { error } = await supabase.from("fasting_sessions").insert({
      user_id: userId,
      protocol: data.protocol,
      target_hours: data.target_hours,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stopFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const end = new Date().toISOString();
    const { data: session } = await supabase
      .from("fasting_sessions")
      .select("start_time, target_hours")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    let completed = false;
    if (session) {
      const hrs = (Date.now() - new Date(session.start_time).getTime()) / 3600000;
      completed = hrs >= Number(session.target_hours);
    }
    const { error } = await supabase
      .from("fasting_sessions")
      .update({ end_time: end, completed })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, completed };
  });