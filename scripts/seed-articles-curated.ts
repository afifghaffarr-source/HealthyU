/**
 * Seed artikel dengan curated content
 * Network ke VexoAPI bermasalah dari server, jadi pakai curated content
 * based on trusted sources.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Curated articles with evidence-based content
const ARTICLES = [
  {
    title: "Protein Nabati vs Hewani: Mana yang Lebih Baik?",
    slug: "protein-nabati-vs-hewani-mana-yang-lebih-baik",
    category: "Nutrisi",
    reading_time_minutes: 3,
    excerpt:
      "Protein nabati dan hewani punya kelebihan masing-masing. Yang penting bukan mana yang 'menang', tapi gimana kamu kombinasikan keduanya dalam pola makan sehari-hari.",
    content: `Sering denger perdebatan protein nabati vs hewani? Yuk kita bahas tanpa drama.

**Apa Bedanya?**

Protein hewani (daging, telur, ikan, susu) punya asam amino lengkap - semua 9 jenis yang tubuh butuh tapi gak bisa bikin sendiri. Bioavailabilitasnya juga tinggi, artinya tubuh lebih gampang nyerap.

Protein nabati (tempe, tahu, kacang-kacangan) kadang kurang lengkap amino acidnya. TAPI, kombinasi yang tepat (misal nasi + tempe) bisa kasih asam amino lengkap juga kok.

**Rekomendasi WHO**

WHO gak bilang salah satu lebih baik. Mereka sarankan variasi - campuran nabati dan hewani sesuai kebutuhan dan nilai-nilai pribadimu.

Untuk orang Indonesia yang biasa makan nasi, kombinasi tempe/tahu + telur/ikan udah bagus banget. Dapet protein lengkap, serat dari nabati, dan omega-3 dari ikan.

**Praktisnya?**

- Sarapan: Telur + tempe (nabati + hewani)
- Makan siang: Ayam + sayur + tahu (nabati + hewani)
- Makan malam: Ikan + tumis kacang panjang

Gak perlu ekstrem. Keduanya bagus, keduanya penting.`,
    source_name: "WHO Guidelines on Protein Intake",
    source_url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    image_url: "https://picsum.photos/seed/protein-article/1200/630",
  },
  {
    title: "Cara Menghitung Kalori Tanpa Timbangan",
    slug: "cara-menghitung-kalori-tanpa-timbangan",
    category: "Praktis",
    reading_time_minutes: 2,
    excerpt:
      "Gak punya food scale? Tenang. Tangan kamu adalah alat ukur yang selalu ada. Ini cara estimasi kalori pakai handrule.",
    content: `Ribet bawa timbangan kemana-mana? Pakai tangan aja.

**Handrule 101**

- **Nasi/Karbo** = 1 kepalan tangan (~150-200 kal)
- **Protein** = 1 telapak tangan (~150-200 kal)
- **Sayur** = 2 genggaman penuh (~25-50 kal)
- **Lemak** = 1 ujung jempol (~45 kal)

**Praktik: Nasi Goreng**

- Nasi: 1.5 kepalan = ~270 kal
- Telur: 1 telapak = ~150 kal
- Ayam: 0.5 telapak = ~75 kal
- Sayur: 1 genggam = ~25 kal
- Minyak goreng: 1 jempol = ~45 kal
- **Total: ~565 kalori**

**Soto Ayam**

- Nasi: 1 kepalan = ~180 kal
- Ayam: 1 telapak = ~150 kal
- Kuah + sayur: ~50 kal
- **Total: ~380 kalori**

Metode ini gak 100% akurat, tapi cukup buat tracking harian. Margin error sekitar 10-15%.`,
    source_name: "Kemenkes RI Pedoman Gizi Seimbang",
    source_url: "https://www.kemkes.go.id",
    image_url: "https://picsum.photos/seed/kalori-handrule/1200/630",
  },
  {
    title: "Mitos: Makan Malam Bikin Gemuk",
    slug: "mitos-makan-malam-bikin-gemuk",
    category: "Mitos",
    reading_time_minutes: 2,
    excerpt:
      "Spoiler: bukan jam makannya yang bikin gemuk, tapi TOTAL kalori harian. Studi Harvard buktikan ini.",
    content: `"Jangan makan malam, nanti gemuk!" - Pernah denger? Mari kita breakdown.

**Yang Penting: Total Kalori**

Harvard T.H. Chan School research nunjukin: yang nentuin berat badan adalah TOTAL kalori dalam 24 jam, bukan kapan kamu makan. Makan 2000 kalori jam 6 sore vs jam 9 malam = efeknya sama kalau totalnya sama.

**Kenapa Mitos Ini Muncul?**

Karena kebanyakan orang makan malam sambil ngemil gak sadar (cemilan, es krim, gorengan). Jadi bukan jam 8 malam-nya yang salah, tapi EXCESS kalori dari ngemilan.

**Kapan Sebaiknya Makan Malam?**

2-3 jam sebelum tidur ideal buat pencernaan. Tapi kalau kerja shift atau pulang malam, makan jam 9-10 gak masalah asal porsinya terkontrol.

**Yang Harus Dihindari**

- Makan malam berat + lanjut cemilan
- Porsi jumbo karena "kelaparan seharian"
- Makanan tinggi gula/lemak trans sebelum tidur

Kesimpulan: Makan malam gak bikin gemuk. Kelebihan kalori yang bikin gemuk.`,
    source_name: "Harvard T.H. Chan School of Public Health",
    source_url: "https://www.hsph.harvard.edu/nutritionsource/",
    image_url: "https://picsum.photos/seed/mitos-makan-malam/1200/630",
  },
  {
    title: "Panduan Intermittent Fasting untuk Pemula",
    slug: "panduan-intermittent-fasting-untuk-pemula",
    category: "Diet",
    reading_time_minutes: 3,
    excerpt:
      "IF bukan diet kelaparan. Ini pola makan yang atur KAPAN kamu makan, bukan APA yang kamu makan. Panduan lengkap metode 16:8.",
    content: `Intermittent Fasting (IF) lagi hits. Tapi sebelum coba, pahami dulu cara kerjanya.

**Apa Itu IF?**

IF = puasa berselang. Metode paling populer: 16:8 (puasa 16 jam, makan dalam window 8 jam). Contoh: makan jam 12 siang - 8 malam, sisanya puasa (boleh minum air).

**Cara Kerja**

Saat puasa 12+ jam, tubuh mulai:
- Autophagy (pembersihan sel rusak)
- Insulin sensitivity membaik
- Fat burning mode aktif

**Cara Mulai (JANGAN Langsung 16 Jam!)**

Minggu 1-2: Puasa 12 jam (8 malam - 8 pagi)
Minggu 3-4: Naikin jadi 14 jam
Minggu 5+: Coba 16 jam kalau nyaman

**Siapa yang TIDAK Boleh IF?**

- Ibu hamil/menyusui
- Diabetes tanpa konsultasi dokter
- Riwayat eating disorder
- Anak/remaja dalam masa pertumbuhan

**Tips untuk Orang Indonesia**

Pakai pola "sahur" - makan terakhir jam 8 malam, makan lagi jam 12 siang. Window 12-8 sore cocok buat yang kerja kantoran.

IF bukan magic. Tetap harus defisit kalori kalau mau turun berat.`,
    source_name: "Johns Hopkins Medicine",
    source_url: "https://www.hopkinsmedicine.org",
    image_url: "https://picsum.photos/seed/intermittent-fasting/1200/630",
  },
  {
    title: "Indeks Glikemik: Pilih Karbohidrat yang Tepat",
    slug: "indeks-glikemik-pilih-karbohidrat-yang-tepat",
    category: "Nutrisi",
    reading_time_minutes: 3,
    excerpt:
      "GI rendah = gula darah stabil = energi tahan lama. Penting buat diabetes dan diet. Ini panduan praktisnya.",
    content: `Kenapa habis makan nasi putih langsung ngantuk, tapi nasi merah bikin kenyang lebih lama? Jawabannya: Indeks Glikemik (GI).

**Apa Itu GI?**

GI = angka yang nunjukin seberapa cepat makanan naikin gula darah.
- GI rendah (55 atau kurang): naiknya pelan, stabil
- GI sedang (56-69): moderat
- GI tinggi (70+): naiknya cepat, turunnya cepat juga (crash)

**Kenapa Penting?**

GI rendah bantu:
- Kontrol gula darah (diabetes)
- Kenyang lebih lama (diet)
- Energi stabil sepanjang hari

**Contoh Praktis**

GI RENDAH (pilih ini):
- Nasi merah: GI 50
- Ubi jalar: GI 44
- Apel: GI 36
- Kacang-kacangan: GI 28

GI TINGGI (batasi):
- Nasi putih: GI 73
- Kentang goreng: GI 75
- Roti tawar putih: GI 75

**Cara Turunkan GI**

1. Kombinasi dengan protein/lemak (nasi + tempe = GI lebih rendah)
2. Tambah serat (nasi putih + sayur)
3. Masak lalu dinginkan (nasi kemarin GI-nya lebih rendah!)

Gak perlu ekstrem hindari nasi putih. Kombinasikan dengan lauk tinggi protein dan serat aja.`,
    source_name: "American Diabetes Association",
    source_url: "https://diabetes.org",
    image_url: "https://picsum.photos/seed/indeks-glikemik/1200/630",
  },
];

async function main() {
  console.log("🌱 Seeding curated articles...\\n");

  const articles = ARTICLES.map((a) => ({
    ...a,
    content_html: a.content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>"),
    author_name: "Tim HealthyU",
    author_title: "Nutrition & Wellness Team",
    is_published: true,
    is_featured: false,
    published_at: new Date().toISOString(),
    tags: [a.category.toLowerCase(), "kesehatan", "nutrisi"],
  }));

  const { data, error } = await supabase.from("articles").insert(articles).select("id, title");

  if (error) {
    console.error("❌ Database error:", error);
    process.exit(1);
  }

  console.log(`\\n✅ Successfully seeded ${data?.length || 0} articles!`);
  console.log("\\nArticles:");
  data?.forEach((a: { title: string }, i: number) => {
    console.log(`  ${i + 1}. ${a.title}`);
  });
}

main().catch(console.error);
