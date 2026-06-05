import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithGuards } from "./aiGateway.server";

const SYSTEM = `Anda adalah AI Food Recognition untuk makanan Indonesia.
Diberikan satu foto, identifikasi SEMUA makanan & minuman yang terlihat.
Untuk tiap item, estimasikan berat porsi (gram) atau volume (ml) berdasarkan referensi visual (piring, gelas, sendok, tangan).

Balas HANYA JSON valid, tanpa markdown fence, dengan bentuk:
{
  "items": [
    {
      "name": "Nama makanan dalam Bahasa Indonesia",
      "name_en": "English name (optional)",
      "portion_g": 250,
      "confidence": 0.9,
      "calories": 420,
      "protein_g": 12,
      "carbs_g": 55,
      "fat_g": 14,
      "notes": "catatan singkat (opsional)"
    }
  ]
}

Aturan:
- Jika tidak yakin, tetap berikan tebakan terbaik dengan confidence rendah.
- Gunakan nama makanan Indonesia yang umum (cth "Nasi Goreng", "Ayam Goreng", "Es Teh Manis").
- Estimasi kalori realistis untuk porsi tersebut.
- Jika foto tidak menunjukkan makanan, balas {"items": []}.`;

const ScanInput = z.object({
  image_data_url: z.string().startsWith("data:image/").max(8_000_000, "Image too large (max ~6MB)"),
  use_pro: z.boolean().optional(),
});

type ScanItem = {
  name: string;
  name_en?: string;
  portion_g?: number;
  portion_ml?: number;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
  matched_food_id?: string | null;
};

export const recognizeFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data, context }): Promise<{ scan_id: string | null; items: ScanItem[] }> => {
    const startedAt = Date.now();
    const { supabase, userId } = context;
    const model = data.use_pro ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const parsed = await callAiJsonWithGuards<{ items?: ScanItem[] }>({
      userId,
      feature: "scan.food.recognize",
      model,
      isPremium: !!data.use_pro,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Kenali makanan di foto ini dan kembalikan JSON sesuai schema.",
            },
            { type: "image_url", image_url: { url: data.image_data_url } },
          ],
        },
      ],
    });
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    // Try matching each item against existing food_items by name (ILIKE)
    const enriched: ScanItem[] = await Promise.all(
      items.slice(0, 8).map(async (it) => {
        const term = (it.name || "").trim().slice(0, 60);
        let matched_food_id: string | null = null;
        if (term) {
          const { data: match } = await supabase
            .from("food_items")
            .select("id")
            .or(`name.ilike.%${term}%,name_en.ilike.%${term}%`)
            .limit(1)
            .maybeSingle();
          matched_food_id = match?.id ?? null;
        }
        return {
          ...it,
          confidence: Number(it.confidence ?? 0),
          calories: Number(it.calories ?? 0),
          protein_g: Number(it.protein_g ?? 0),
          carbs_g: Number(it.carbs_g ?? 0),
          fat_g: Number(it.fat_g ?? 0),
          matched_food_id,
        };
      }),
    );

    // Persist scan for audit + correction trail
    let scan_id: string | null = null;
    try {
      const totalCal = enriched.reduce((s, i) => s + (i.calories || 0), 0);
      const totalP = enriched.reduce((s, i) => s + (i.protein_g || 0), 0);
      const totalC = enriched.reduce((s, i) => s + (i.carbs_g || 0), 0);
      const totalF = enriched.reduce((s, i) => s + (i.fat_g || 0), 0);
      const avgConf = enriched.length
        ? enriched.reduce((s, i) => s + (i.confidence || 0), 0) / enriched.length
        : 0;
      const { data: row } = await supabase
        .from("food_scans")
        .insert({
          user_id: userId,
          detected_foods: JSON.parse(JSON.stringify(enriched)),
          total_calories: totalCal,
          total_protein: totalP,
          total_carbs: totalC,
          total_fat: totalF,
          model_version: model.split("/")[1] ?? model,
          processing_time_ms: Date.now() - startedAt,
          avg_confidence: avgConf,
        })
        .select("id")
        .single();
      scan_id = row?.id ?? null;
    } catch {
      /* non-blocking */
    }

    return { scan_id, items: enriched };
  });

const CorrectionInput = z.object({
  scan_id: z.string().uuid().nullable(),
  original: z.unknown(),
  corrected: z.unknown(),
  note: z.string().max(500).optional(),
});

export const submitScanCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CorrectionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_audit_opt_in")
      .eq("id", userId)
      .maybeSingle();
    if (prof && prof.scan_audit_opt_in === false) {
      return { ok: true, skipped: true };
    }
    const { error } = await supabase.from("food_scan_corrections").insert({
      user_id: userId,
      scan_id: data.scan_id,
      original: data.original as never,
      corrected: data.corrected as never,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
