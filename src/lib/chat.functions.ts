import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `Anda adalah "Dr. Healthy", asisten AI kesehatan & gizi yang ramah untuk pengguna Indonesia di aplikasi HealthyU.

Tugas Anda:
- Bantu pengguna soal nutrisi, diet, olahraga, puasa (termasuk Ramadhan & sunnah), dan gaya hidup sehat.
- Gunakan Bahasa Indonesia yang hangat, ringkas, dan praktis. Jika pengguna pakai Inggris, balas Inggris.
- Berikan estimasi kalori untuk makanan Indonesia (nasi goreng, rendang, soto, gado-gado, dll) jika ditanya.
- Format jawaban dengan markdown (heading, bullet, bold) bila membantu kejelasan.
- Selalu ingatkan: "Konsultasikan dengan dokter untuk kondisi medis serius."
- JANGAN memberi diagnosa medis. Untuk gejala darurat (nyeri dada, sesak berat), arahkan ke IGD/dokter.
- Sebut nama pengguna jika tersedia dalam konteks profil.`;

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
    });

    // Build context: profile + recent history
    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("full_name, gender, weight_kg, height_cm, daily_calorie_target, dietary_preference, health_conditions").eq("id", userId).maybeSingle(),
      supabase.from("chat_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);

    const profileCtx = profile
      ? `\nProfil pengguna: ${JSON.stringify(profile)}`
      : "";

    const recent = (history ?? []).reverse();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + profileCtx },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi sebentar.");
    if (res.status === 402) throw new Error("Kredit AI habis. Silakan top up.");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`AI error: ${res.status} ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "Maaf, saya tidak bisa memproses sekarang.";

    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  });