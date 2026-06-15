import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";
import { logServerError } from "@/lib/logger.server";

const callAI = makeScanAiCaller("scanBatch8");

const BudgetPlanSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.union([z.string(), z.number()]).optional(),
        meals: z
          .array(
            z.object({
              name: z.string().default(""),
              est_idr: z.number().optional(),
              calories: z.number().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

const ImportedRecipeSchema = z.object({
  title: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
});

// ===== from scanBatch7b2 (voteFamilyMeal, getFamilyMealVotes) =====

export const voteFamilyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; mealName: string }) =>
    z.object({ planId: z.string().uuid(), mealName: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("family_meal_votes").insert({
      plan_id: data.planId,
      user_id: userId,
      meal_name: data.mealName,
      vote_date: today,
    });
    return { ok: true };
  });

export const getFamilyMealVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("family_meal_votes")
      .select("meal_name")
      .eq("plan_id", data.planId)
      .eq("vote_date", today);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      counts[r.meal_name] = (counts[r.meal_name] ?? 0) + 1;
    }
    return { counts };
  });

// ===== from scanBatch8b2 (createFamilyInvite, redeemFamilyInvite, createDoctorReferral, smartShoppingList) =====

export const createFamilyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data: inserted } = await supabase
      .from("family_invites")
      .insert({ plan_id: data.planId, token, created_by: userId })
      .select()
      .single();
    return { invite: inserted };
  });

export const redeemFamilyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(5).max(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: inv } = await supabase
      .from("family_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) throw new Error("Invite tidak valid");
    if (inv.used_by) throw new Error("Sudah dipakai");
    if (new Date(inv.expires_at) < new Date()) throw new Error("Kadaluarsa");
    await supabase.from("family_plan_members").insert({ plan_id: inv.plan_id, user_id: userId });
    await supabase
      .from("family_invites")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inv.id);
    return { planId: inv.plan_id };
  });

export const createDoctorReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string }) =>
    z.object({ reason: z.string().min(5).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const analysis = await callAI(
      `Pasien: "${data.reason}". Tentukan urgency (low/medium/high) dan spesialis yang direkomendasikan. Format JSON: {urgency, specialist, notes}.`,
      "Kamu triage assistant.",
      userId,
      supabase,
    );
    type ReferralParsed = { urgency?: string; specialist?: string; notes?: string };
    let parsed: ReferralParsed = {};
    try {
      parsed = JSON.parse(analysis.replace(/```json|```/g, "").trim()) as ReferralParsed;
    } catch {
      parsed = { urgency: "low", specialist: "General Practitioner", notes: analysis };
    }
    const { data: inserted } = await supabase
      .from("doctor_referrals")
      .insert({
        user_id: userId,
        reason: data.reason,
        urgency: parsed.urgency ?? "low",
        recommended_specialist: parsed.specialist,
        notes: parsed.notes,
      })
      .select()
      .single();
    return { referral: inserted };
  });

export const smartShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ingredients: string[] }) =>
    z.object({ ingredients: z.array(z.string().min(1).max(80)).min(1).max(40) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = await callAI(
      `Estimasi harga pasar Indonesia (IDR) untuk: ${data.ingredients.join(", ")}. Format JSON array: [{item, qty, price_idr}]. Hanya JSON.`,
      "Kamu shopping assistant Indonesia.",
      context.userId,
      context.supabase,
    );
    type ShopItem = { item: string; qty: string | number; price_idr: number };
    let items: ShopItem[] = [];
    try {
      const raw = JSON.parse(text.replace(/```json|```/g, "").trim());
      items = Array.isArray(raw) ? (raw as ShopItem[]) : [];
    } catch {
      items = data.ingredients.map((i) => ({ item: i, qty: "1", price_idr: 10000 }));
    }
    const total = items.reduce<number>((s, it) => s + (it.price_idr ?? 0), 0);
    return { items, total };
  });

// ===== from scanFinal2 (createFamilyPlan, listMyFamily, estimateGroceryCost, convertIdr) =====

export const createFamilyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string }) =>
    z.object({ name: z.string().min(1).max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: plan, error } = await supabase
      .from("family_plans")
      .insert({ owner_id: userId, name: data.name ?? "Keluarga" })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("family_plan_members").insert({ plan_id: plan.id, user_id: userId });
    return { plan };
  });

export const listMyFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("family_plan_members")
      .select("plan_id, family_plans(id, name, owner_id)")
      .eq("user_id", userId);
    return { plans: memberships ?? [] };
  });

export const estimateGroceryCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: string[] }) =>
    z.object({ items: z.array(z.string().min(1).max(100)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const text = await callAiWithGuards({
      userId,
      feature: "grocery.cost.estimate",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Estimasi harga pasar Indonesia 2026 untuk bahan groceries. JSON array: [{item, estimatedIdr, note}].",
        },
        { role: "user", content: `Items: ${JSON.stringify(data.items)}` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    let estimates: Array<{ item: string; estimatedIdr: number; note?: string }> = [];
    try {
      estimates = m ? JSON.parse(m[0]) : [];
    } catch (e) {
      // AI returned a non-JSON estimate list. Fall through to zero
      // estimates so caller can still compute a partial total.
      logServerError("scanPlan.budgetEstimate", e, { stage: "json-parse" });
    }
    const totalIdr = estimates.reduce((s, e) => s + Number(e.estimatedIdr || 0), 0);
    return { estimates, totalIdr };
  });

const RATES: Record<string, number> = {
  IDR: 1,
  USD: 1 / 15800,
  MYR: 1 / 3500,
  SGD: 1 / 11800,
  EUR: 1 / 17000,
};
export function convertIdr(amountIdr: number, code: string): number {
  const r = RATES[code] ?? 1;
  return Math.round(amountIdr * r * 100) / 100;
}

// ===== from scanBatch12a (generateBudgetMealPlan, generateGroceryList, importRecipeFromUrl) =====

export const generateBudgetMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        budgetIdr: z.number().int().min(10000).max(10000000),
        days: z.number().int().min(1).max(14),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const parsed = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "mealplan.budget",
      schema: BudgetPlanSchema,
      fallback: { days: [] },
      messages: [
        {
          role: "system",
          content:
            "Kamu ahli gizi & budget Indonesia. Jawab JSON {days:[{day, meals:[{name, est_idr, calories}]}]} dengan total mendekati budget.",
        },
        {
          role: "user",
          content: `Budget total: Rp ${data.budgetIdr} untuk ${data.days} hari. 3 meal/hari. Gunakan bahan lokal murah.`,
        },
      ],
    });
    const planStr = JSON.stringify(parsed ?? {});
    await context.supabase.from("budget_meal_plans").insert({
      user_id: context.userId,
      budget_idr: data.budgetIdr,
      days: data.days,
      plan: parsed as never,
    });
    return { planJson: planStr };
  });

export const generateGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ planText: z.string().min(10).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const txt = await callAiWithGuards({
      userId: context.userId,
      feature: "grocery.from_plan",
      messages: [
        {
          role: "system",
          content:
            "Buat daftar belanja dari meal plan. Balas JSON array: [{name, qty, unit}]. Tanpa markdown.",
        },
        { role: "user", content: data.planText },
      ],
    });
    let items: Array<{ name: string; qty?: string; unit?: string }> = [];
    try {
      items = JSON.parse(txt.replace(/^```json|```$/g, "").trim());
    } catch {
      items = [];
    }
    const { data: row } = await context.supabase
      .from("grocery_lists")
      .insert({
        user_id: context.userId,
        source: "mealplan",
        items: items as never,
      })
      .select()
      .single();
    return { list: row };
  });

export const importRecipeFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    let html = "";
    try {
      const r = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0 RecipeBot" } });
      html = (await r.text()).slice(0, 50000);
    } catch (e) {
      throw new Error("Gagal mengambil halaman");
    }
    const parsed = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "recipe.import_from_url",
      schema: ImportedRecipeSchema,
      fallback: { ingredients: [], steps: [] },
      messages: [
        {
          role: "system",
          content:
            "Ekstrak resep dari HTML. Balas JSON: {title, ingredients:[], steps:[]}. Tanpa markdown.",
        },
        { role: "user", content: html },
      ],
    });
    const { data: row } = await context.supabase
      .from("imported_recipes")
      .insert({
        user_id: context.userId,
        source_url: data.url,
        title: parsed.title ?? null,
        ingredients: parsed.ingredients ?? [],
        steps: parsed.steps ?? [],
      })
      .select()
      .single();
    return { recipe: row, parsed };
  });
