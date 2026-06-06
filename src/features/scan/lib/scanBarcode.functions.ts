import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== from scanBatch9b (scanBarcode) =====

export const scanBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ barcode: z.string().min(6).max(20).regex(/^\d+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cached } = await supabase
      .from("barcode_cache")
      .select("*")
      .eq("barcode", data.barcode)
      .maybeSingle();
    if (cached) return { product: cached, cached: true };
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data.barcode}.json`);
    if (!res.ok) throw new Error("Barcode tidak ditemukan");
    const json = (await res.json()) as { product?: Record<string, unknown>; status?: number };
    if (json.status !== 1 || !json.product) throw new Error("Produk tidak ditemukan");
    const p = json.product as Record<string, unknown>;
    const n = (p.nutriments ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" ? v : v ? Number(v) : null);
    const product = {
      barcode: data.barcode,
      product_name: (p.product_name as string) ?? null,
      brand: (p.brands as string) ?? null,
      calories_per_100g: num(n["energy-kcal_100g"]),
      protein_g: num(n.proteins_100g),
      carbs_g: num(n.carbohydrates_100g),
      fat_g: num(n.fat_100g),
      allergens:
        (p.allergens_tags as string[] | undefined)?.map((a) => a.replace(/^en:/, "")) ?? null,
      raw: JSON.parse(JSON.stringify(p)) as never,
    };
    await supabase.from("barcode_cache").insert(product as never);
    const { raw: _omit, ...safe } = product;
    void _omit;
    return {
      product: { ...safe, created_at: new Date().toISOString(), raw: null as never },
      cached: false,
    };
  });

// ===== from scanExtras2 (lookupBarcode) =====

export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        barcode: z
          .string()
          .min(6)
          .max(20)
          .regex(/^[0-9]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data.barcode}.json`);
    if (!res.ok) return { found: false };
    const j = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        nutriments?: {
          "energy-kcal_100g"?: number;
          proteins_100g?: number;
          carbohydrates_100g?: number;
          fat_100g?: number;
        };
        image_front_small_url?: string;
      };
    };
    if (j.status !== 1 || !j.product) return { found: false };
    const p = j.product;
    return {
      found: true,
      name: p.product_name ?? "Produk",
      brand: p.brands ?? "",
      image: p.image_front_small_url ?? null,
      per100g: {
        calories: Number(p.nutriments?.["energy-kcal_100g"] ?? 0),
        protein: Number(p.nutriments?.proteins_100g ?? 0),
        carbs: Number(p.nutriments?.carbohydrates_100g ?? 0),
        fat: Number(p.nutriments?.fat_100g ?? 0),
      },
    };
  });

// ===== from scanMore2 (barcodeBatchLookup) =====

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
