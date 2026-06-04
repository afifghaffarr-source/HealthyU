import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "scan-photos";

export const attachScanPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        scan_id: z.string().uuid(),
        image_data_url: z.string().startsWith("data:image/").max(8_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const match = data.image_data_url.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    const contentType = match[1];
    const ext = contentType.split("/")[1] || "jpg";
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const path = `${userId}/${data.scan_id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { error: updErr } = await supabase
      .from("food_scans")
      .update({ image_url: path })
      .eq("id", data.scan_id)
      .eq("user_id", userId);
    if (updErr) throw new Error(updErr.message);
    return { ok: true, path };
  });

export const listScanGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("food_scans")
      .select("id, image_url, detected_foods, total_calories, created_at")
      .eq("user_id", userId)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const paths = rows.map((r) => r.image_url as string).filter(Boolean);
    const signedMap: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl;
      });
    }
    return {
      items: rows.map((r) => ({
        id: r.id,
        url: r.image_url ? (signedMap[r.image_url] ?? null) : null,
        total_calories: Number(r.total_calories ?? 0),
        created_at: r.created_at,
        detected_foods: r.detected_foods,
      })),
    };
  });

export const parseVoiceMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ transcript: z.string().min(2).max(1000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");
    const prompt = `Pengguna mengucapkan: "${data.transcript}". Ekstrak daftar makanan/minuman yang dikonsumsi beserta estimasi porsi & kalori (Bahasa Indonesia). Balas HANYA JSON: {"items":[{"name":"...","portion_g":150,"calories":300,"protein_g":10,"carbs_g":40,"fat_g":8,"confidence":0.7}]}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limited.");
    if (res.status === 402) throw new Error("Kredit AI habis.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as {
        items?: Array<{
          name: string;
          portion_g?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          confidence?: number;
        }>;
      };
      return { items: parsed.items ?? [] };
    } catch {
      return { items: [] };
    }
  });
