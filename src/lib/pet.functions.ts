import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const getPet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("virtual_pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { pet: data ?? null };
  });

const CreateSchema = z.object({
  pet_name: z.string().min(1).max(40),
  pet_type: z.enum(["cat", "dog", "rabbit", "panda", "fox"]).default("cat"),
});

export const adoptPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("virtual_pets")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { id: existing.id, already: true };
    const { data: created, error } = await supabase
      .from("virtual_pets")
      .insert({ user_id: userId, ...data })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id, already: false };
  });

const ActionSchema = z.object({
  action: z.enum(["feed", "play", "rest"]),
});

export const interactPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ActionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pet, error: petErr } = await supabase
      .from("virtual_pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (petErr) throw new Error(petErr.message);
    if (!pet) throw new Error("Belum punya pet");

    let dH = 0,
      dHap = 0,
      dE = 0,
      dHun = 0;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (data.action === "feed") {
      dH = 5;
      dHun = -25;
      dE = 5;
      patch.last_fed_at = now;
    } else if (data.action === "play") {
      dHap = 15;
      dE = -15;
      dHun = 10;
      patch.last_played_at = now;
    } else {
      dE = 25;
      dHap = -2;
    }
    patch.health_stat = clamp((pet.health_stat ?? 80) + dH);
    patch.happiness_stat = clamp((pet.happiness_stat ?? 80) + dHap);
    patch.energy_stat = clamp((pet.energy_stat ?? 80) + dE);
    patch.hunger_stat = clamp((pet.hunger_stat ?? 50) + dHun);
    patch.evolution_points = (pet.evolution_points ?? 0) + 5;

    await supabase.from("virtual_pets").update(patch).eq("id", pet.id);
    await supabase.from("pet_interactions").insert({
      pet_id: pet.id,
      interaction_type: data.action,
      health_boost: dH,
      happiness_boost: dHap,
      energy_boost: dE,
    });
    return { ok: true };
  });