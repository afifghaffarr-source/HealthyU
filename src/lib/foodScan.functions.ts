import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  image_data_url: z
    .string()
    .startsWith("data:image/")
    .max(8_000_000, "Image too large (max ~6MB)"),
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
  .handler(async ({ data, context }): Promise<{ items: ScanItem[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Kenali makanan di foto ini dan kembalikan JSON sesuai schema." },
              { type: "image_url", image_url: { url: data.image_data_url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi sebentar.");
    if (res.status === 402) throw new Error("Kredit AI habis. Silakan top up.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`AI error: ${res.status} ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { items?: ScanItem[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = { items: [] };
        }
      }
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    // Try matching each item against existing food_items by name (ILIKE)
    const { supabase } = context;
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

    return { items: enriched };
  });