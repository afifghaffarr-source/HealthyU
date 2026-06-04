import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("progress_photos")
      .select("id, photo_url, weight_kg, notes, taken_at")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false });
    if (error) throw new Error(error.message);
    const items = data ?? [];
    const paths = items.map((i) => i.photo_url);
    let urlMap = new Map<string, string | null>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("progress-photos")
        .createSignedUrls(paths, 60 * 60);
      urlMap = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
    }
    return items.map((i) => ({ ...i, signed_url: urlMap.get(i.photo_url) ?? null }));
  });

export const addProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        photo_url: z.string().min(1).max(500),
        weight_kg: z.number().positive().max(500).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("progress_photos").insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), photo_url: z.string() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.storage.from("progress-photos").remove([data.photo_url]);
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
