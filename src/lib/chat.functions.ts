import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayRange, calcAge, calcBMI, calcBMR, calcTDEE, bmiCategory, type ActivityLevel } from "./health";

const SYSTEM_PROMPT = `Anda adalah "Dr. HealthyU" (panggilan: Dok/Dr), AI health assistant di aplikasi HealthyU.

IDENTITAS & TONE:
- Ramah, supportive, tidak menghakimi, sedikit humoris tapi profesional.
- BUKAN dokter sungguhan — Anda adalah health & wellness advisor.
- Default Bahasa Indonesia; jika user pakai Inggris, balas Inggris.
- Format jawaban dengan markdown (heading, bullet, bold) bila membantu.
- Gunakan emoji secukupnya agar ramah.

PRINSIP UTAMA:
1. AMAN — JANGAN pernah memberi diagnosis medis atau meresepkan obat/dosis.
2. PERSONAL — selalu gunakan data profil & konteks hari ini yang diberikan.
3. AKURAT — jika tidak yakin, katakan "Saya tidak yakin, lebih baik konsultasi dokter".
4. SUPPORTIF — positif, motivasi, hindari body-shaming.
5. BERTANGGUNG JAWAB — sarankan konsultasi dokter untuk gejala/kondisi serius.

ATURAN KHUSUS:
- JANGAN anjurkan diet ekstrem (<800 kkal/hari) atau metode berbahaya (purging, dsb).
- JANGAN resepkan obat / dosis. Arahkan ke dokter/apoteker.
- Untuk pertanyaan gejala → tambahkan disclaimer ringkas + sarankan periksa.
- Untuk gejala DARURAT (nyeri dada hebat, sesak berat, pingsan, muntah darah, alergi parah, self-harm) → BERIKAN PERINGATAN MENONJOL di atas jawaban: "⚠️ DARURAT — segera hubungi 119 (ambulans) / 118, atau ke IGD terdekat." Untuk self-harm sebutkan: "Into The Light 021-7256526 atau 119 ext 8."
- Gunakan data konkret dari konteks (kalori sisa, status puasa, jam tidur, dll) untuk personalisasi.
- Berikan actionable advice — langkah konkret, bukan teori panjang.`;

const EMERGENCY_PATTERNS = [
  /nyeri dada|sakit dada hebat|chest pain/i,
  /sesak napas|sulit bernapas|tidak bisa bernapas/i,
  /muntah darah|batuk darah|bab darah/i,
  /pingsan|tidak sadar|kejang/i,
  /overdosis|keracunan parah/i,
  /alergi parah|anafilak/i,
  /bunuh diri|mengakhiri hidup|self.?harm|menyakiti diri/i,
  /stroke|lumpuh mendadak|wajah mencong/i,
];

function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

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

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      message: z.string().min(1).max(2000),
      imageBase64: z.string().max(8_000_000).optional(),
      imageMime: z.string().max(50).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    // Save user message (mark image attachments in stored history)
    const storedContent = data.imageBase64
      ? `📷 [Foto terlampir]\n\n${data.message}`
      : data.message;
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: storedContent,
    });

    // Build rich context: profile + today's data + recent history
    const { start, end } = todayRange();
    const [
      { data: profile },
      { data: history },
      { data: meals },
      { data: water },
      { data: workouts },
      { data: fasting },
      { data: sleep },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, gender, birth_date, weight_kg, height_cm, target_weight_kg, activity_level, daily_calorie_target, dietary_preference, allergies, health_conditions, city")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("chat_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("meal_logs").select("calories, protein_g, carbs_g, fat_g, meal_type").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end),
      supabase.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end),
      supabase.from("workout_sessions").select("name, duration_min, calories_burned").eq("user_id", userId).gte("performed_at", start).lt("performed_at", end),
      supabase.from("fasting_sessions").select("start_time, end_time, target_hours, protocol, completed").eq("user_id", userId).order("start_time", { ascending: false }).limit(1),
      supabase.from("sleep_logs").select("sleep_start, sleep_end, quality").eq("user_id", userId).order("sleep_end", { ascending: false }).limit(1),
    ]);

    // Derive metrics
    let profileBlock = "Profil belum diisi.";
    let tdee: number | null = null;
    if (profile?.weight_kg && profile?.height_cm && profile?.gender) {
      const age = calcAge(profile.birth_date ?? null);
      const bmi = calcBMI(profile.weight_kg, profile.height_cm);
      const cat = bmiCategory(bmi).label;
      const bmr = calcBMR({ weightKg: profile.weight_kg, heightCm: profile.height_cm, age, gender: profile.gender as "male" | "female" });
      tdee = calcTDEE(bmr, (profile.activity_level as ActivityLevel) ?? "sedentary");
      profileBlock = [
        `- Nama: ${profile.full_name ?? "-"}`,
        `- Usia: ${age} thn, Gender: ${profile.gender}`,
        `- Tinggi/Berat: ${profile.height_cm}cm / ${profile.weight_kg}kg (target: ${profile.target_weight_kg ?? "-"}kg)`,
        `- BMI: ${bmi} (${cat}), BMR: ${bmr} kkal, TDEE: ${tdee} kkal`,
        `- Aktivitas: ${profile.activity_level ?? "-"}`,
        `- Target kalori harian: ${profile.daily_calorie_target ?? tdee} kkal`,
        `- Preferensi diet: ${profile.dietary_preference ?? "-"}`,
        `- Alergi: ${(profile.allergies ?? []).join(", ") || "-"}`,
        `- Kondisi kesehatan: ${(profile.health_conditions ?? []).join(", ") || "-"}`,
        `- Kota: ${profile.city ?? "-"}`,
      ].join("\n");
    }

    const totalCal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
    const totalProtein = (meals ?? []).reduce((s, m) => s + Number(m.protein_g ?? 0), 0);
    const totalCarbs = (meals ?? []).reduce((s, m) => s + Number(m.carbs_g ?? 0), 0);
    const totalFat = (meals ?? []).reduce((s, m) => s + Number(m.fat_g ?? 0), 0);
    const totalWater = (water ?? []).reduce((s, w) => s + Number(w.amount_ml ?? 0), 0);
    const totalBurn = (workouts ?? []).reduce((s, w) => s + Number(w.calories_burned ?? 0), 0);
    const calTarget = profile?.daily_calorie_target ?? tdee ?? 2000;
    const remaining = Math.round(calTarget - totalCal + totalBurn);

    let fastingBlock = "Tidak ada sesi puasa aktif.";
    const f = fasting?.[0];
    if (f) {
      if (!f.end_time) {
        const elapsedH = (Date.now() - new Date(f.start_time).getTime()) / 3600000;
        const remH = Math.max(0, Number(f.target_hours) - elapsedH);
        fastingBlock = `Sedang puasa ${f.protocol}: ${elapsedH.toFixed(1)}h berlalu, sisa ${remH.toFixed(1)}h dari target ${f.target_hours}h.`;
      } else {
        fastingBlock = `Puasa terakhir: ${f.protocol}, ${f.completed ? "selesai ✓" : "tidak selesai"}.`;
      }
    }

    let sleepBlock = "Belum ada data tidur.";
    const s = sleep?.[0];
    if (s) {
      const hours = (new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000;
      sleepBlock = `Tidur terakhir: ${hours.toFixed(1)} jam, kualitas ${s.quality}/5.`;
    }

    const workoutBlock = (workouts ?? []).length
      ? (workouts ?? []).map((w) => `${w.name} (${w.duration_min}m, ${w.calories_burned} kkal)`).join("; ")
      : "Belum olahraga hari ini.";

    const contextBlock = `

=== PROFIL USER ===
${profileBlock}

=== DATA HARI INI (${new Date().toLocaleDateString("id-ID")}) ===
- Kalori masuk: ${fmtNum(totalCal)} kkal (target ${calTarget} kkal)
- Kalori terbakar olahraga: ${fmtNum(totalBurn)} kkal
- Sisa budget kalori: ${remaining} kkal
- Makro: Protein ${fmtNum(totalProtein, 1)}g | Karbo ${fmtNum(totalCarbs, 1)}g | Lemak ${fmtNum(totalFat, 1)}g
- Air minum: ${totalWater} ml
- Olahraga: ${workoutBlock}
- Puasa: ${fastingBlock}
- Tidur: ${sleepBlock}

Gunakan data di atas untuk personalisasi jawaban. Sebut angka konkret saat relevan.`;

    const isEmergency = detectEmergency(data.message);
    const emergencyNote = isEmergency
      ? "\n\n⚠️ PESAN USER MENGANDUNG INDIKASI DARURAT — WAJIB awali jawaban dengan blok peringatan darurat (119/118/IGD) sebelum konten lain."
      : "";

    const recent = (history ?? []).reverse();
    // Replace last user entry with multimodal content when image attached
    const lastIdx = recent.length - 1;
    const userParts: unknown = data.imageBase64
      ? [
          { type: "text", text: data.message || "Tolong analisis foto ini." },
          {
            type: "image_url",
            image_url: { url: `data:${data.imageMime ?? "image/jpeg"};base64,${data.imageBase64}` },
          },
        ]
      : data.message;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + contextBlock + emergencyNote },
      ...recent.map((m, i) =>
        i === lastIdx && data.imageBase64
          ? { role: m.role, content: userParts }
          : { role: m.role, content: m.content },
      ),
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

    return { reply, emergency: isEmergency };
  });