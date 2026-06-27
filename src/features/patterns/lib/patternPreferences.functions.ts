import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { PatternPreferences } from "../types/preferences";
import { parsePatternPreferences } from "../types/preferences";

export const getPatternPreferences = createServerFn({ method: "GET" }).handler(async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pattern_preferences")
    .eq("id", user.id)
    .single();

  return parsePatternPreferences(profile?.pattern_preferences);
});

export const updatePatternPreferences = createServerFn({ method: "POST" })
  .validator((data: PatternPreferences) => data)
  .handler(async (ctx) => {
    const supabase = createSupabaseServerClient(ctx.context);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
      .from("profiles")
      .update({
        pattern_preferences: ctx.data,
      })
      .eq("id", user.id);

    if (error) throw error;

    return { success: true };
  });
