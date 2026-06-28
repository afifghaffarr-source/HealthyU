import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  summarizeSustainability,
  type MealLogForEmission,
  type SustainabilitySummary,
} from "./sustainability";

/**
 * Sprint 30 — getSustainabilitySummary server fn.
 *
 * Reads last-7-days meal_logs (custom_name field) and pipes them into
 * the pure sustainability helper. No new table, no AI cost — it is a
 * curated lookup + math.
 */

interface MealRow {
  id: string;
  custom_name: string | null;
}

export const getSustainabilitySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<SustainabilitySummary> => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data, error } = await supabase
      .from("meal_logs")
      .select("id, custom_name")
      .eq("user_id", userId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const rows: MealLogForEmission[] = Array.isArray(data)
      ? (data as MealRow[]).map((r) => ({
          id: r.id,
          custom_name: r.custom_name,
          calories: null,
        }))
      : [];

    return summarizeSustainability(rows);
  });
