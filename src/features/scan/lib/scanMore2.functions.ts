import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const MealTagsSchema = z.object({
  halal: z.union([z.boolean(), z.null()]).optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  allergens: z.array(z.string()).default([]),
  allergy_warning: z.union([z.string(), z.null()]).optional(),
  translated_name: z.union([z.string(), z.null()]).optional(),
});
// ============ 14: export CSV ============
export const exportMealsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date, meal_type, custom_name, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    const header = "date,meal,name,calories,protein,carbs,fat";
    const escape = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = (data ?? []).map((r) =>
      [
        r.log_date,
        r.meal_type,
        escape(r.custom_name),
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
      ].join(","),
    );
    return { csv: [header, ...rows].join("\n"), count: rows.length };
  });

// ============ 15,16,17: translate + halal/vegan + allergen ============
export const classifyMealTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ name: z.string().min(1).max(200), translate_to: z.string().length(2).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("allergies, dietary_preference")
      .eq("id", userId)
      .maybeSingle();
    const allergies = (prof?.allergies as string[] | null)?.join(", ") || "(tidak ada)";
    const diet = prof?.dietary_preference ?? "(tidak ada)";
    const prompt = `Makanan: "${data.name}". User allergies: ${allergies}. Diet: ${diet}.${
      data.translate_to ? ` Terjemahkan name ke kode bahasa "${data.translate_to}".` : ""
    } Balas JSON {"halal":true|false|null,"vegan":true|false,"vegetarian":true|false,"allergens":["..."],"allergy_warning":"...|null","translated_name":"...|null"}`;
    return await callAiJsonWithSchema({
      userId,
      feature: "meal.classify.tags",
      model: "google/gemini-2.5-flash",
      schema: MealTagsSchema,
      fallback: { allergens: [] },
      messages: [{ role: "user", content: prompt }],
    });
  });

// ============ 11: group meal feed ============
export const groupMealFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ group_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Bukan anggota grup");
    const { data: members } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return { meals: [] };
    const today = new Date().toISOString().slice(0, 10);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("id, user_id, custom_name, meal_type, calories, logged_at")
      .in("user_id", ids)
      .eq("log_date", today)
      .order("logged_at", { ascending: false })
      .limit(50);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids);
    const byUser: Record<string, { name: string; avatar: string | null }> = {};
    (profs ?? []).forEach(
      (p) => (byUser[p.id] = { name: p.full_name ?? "", avatar: p.avatar_url ?? null }),
    );
    return {
      meals: (meals ?? []).map((m) => ({
        ...m,
        user_name: byUser[m.user_id]?.name ?? "Anggota",
        user_avatar: byUser[m.user_id]?.avatar ?? null,
      })),
    };
  });

// ============ 19: barcode batch lookup ============
const BarcodeBatch = z.object({
  barcodes: z
    .array(
      z
        .string()
        .regex(/^[0-9]+$/)
        .min(6)
        .max(20),
    )
    .min(1)
    .max(20),
});
export const barcodeBatchLookup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BarcodeBatch.parse(i))
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.barcodes.map(async (code) => {
        try {
          const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
          if (!r.ok) return { code, found: false };
          const j = (await r.json()) as {
            status?: number;
            product?: {
              product_name?: string;
              nutriments?: { "energy-kcal_100g"?: number };
            };
          };
          if (j.status !== 1 || !j.product) return { code, found: false };
          return {
            code,
            found: true,
            name: j.product.product_name ?? "Produk",
            calories: Number(j.product.nutriments?.["energy-kcal_100g"] ?? 0),
          };
        } catch {
          return { code, found: false };
        }
      }),
    );
    return { results };
  });
