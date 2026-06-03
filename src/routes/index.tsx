import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Utensils,
  Timer,
  Moon,
  Activity,
  ChefHat,
  Bell,
  MessageCircle,
  Star,
  Check,
  Shield,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      { name: "description", content: "Diet personal, puasa terencana, jadwal sholat, dan AI coach Dr. Healthy. Database makanan Indonesia lengkap. Gratis." },
      { name: "keywords", content: "diet, puasa, intermittent fasting, nutrisi, AI coach, makanan Indonesia, jadwal sholat, kalori" },
      { property: "og:title", content: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      { property: "og:description", content: "Diet personal, puasa terencana, jadwal sholat, dan AI coach Dr. Healthy. Gratis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      { name: "twitter:description", content: "Diet personal, puasa, jadwal sholat, dan AI coach." },
    ],
    links: [{ rel: "canonical", href: "https://healthyu.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "HealthyU",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web, iOS, Android",
          offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "1240" },
          description: "AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat.",
        }),
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Utensils, title: "Database makanan Indonesia", desc: "Ribuan menu lokal lengkap dengan kalori & makro." },
  { icon: Timer, title: "Puasa 16:8 & Ramadhan", desc: "Timer puasa cerdas dengan reminder sahur & berbuka." },
  { icon: Moon, title: "Jadwal sholat", desc: "Waktu sholat akurat sesuai kota kamu." },
  { icon: Activity, title: "Lacak makro & air", desc: "Pantau protein, karbo, lemak, dan hidrasi harian." },
  { icon: ChefHat, title: "Rekomendasi AI", desc: "Meal plan harian otomatis sesuai goal & alergi." },
  { icon: MessageCircle, title: "Chat Dr. Healthy", desc: "Tanya AI coach kapan saja, dalam Bahasa Indonesia." },
  { icon: Bell, title: "Smart reminders", desc: "Pengingat makan, minum, olahraga, & obat." },
  { icon: Trophy, title: "Gamifikasi & streak", desc: "Naik level, raih achievement, jaga konsistensi." },
];

const STEPS = [
  { n: "01", title: "Daftar gratis", desc: "Buat akun dalam 30 detik dengan email atau Google." },
  { n: "02", title: "Isi profil & goal", desc: "Kami hitung kebutuhan kalori & makro personalmu." },
  { n: "03", title: "Catat & dapat insight", desc: "Log makanan, ikuti meal plan AI, capai targetmu." },
];

const TESTIMONIALS = [
  { name: "Rina, 28", city: "Jakarta", quote: "Turun 6 kg dalam 2 bulan tanpa kelaparan. Meal plan AI-nya pas banget sama selera Indonesia.", rating: 5 },
  { name: "Budi, 35", city: "Surabaya", quote: "Akhirnya app puasa yang ngerti jadwal Ramadhan. Reminder sahur penyelamat hidup.", rating: 5 },
  { name: "Sari, 24", city: "Bandung", quote: "Dr. Healthy jawab pertanyaan diet lebih cepat dari nutritionist saya. Worth it banget!", rating: 5 },
];

const FAQ = [
  { q: "Apakah benar-benar gratis?", a: "Ya, semua fitur inti gratis. Tidak perlu kartu kredit untuk daftar." },
  { q: "Apakah makanan Indonesia lengkap?", a: "Database kami berisi ribuan menu lokal: nasi padang, gado-gado, soto, hingga jajanan tradisional." },
  { q: "Bagaimana AI coach bekerja?", a: "Dr. Healthy menggunakan AI canggih untuk memberi saran berdasarkan profil, riwayat makan, dan goal kamu." },
  { q: "Aman untuk data saya?", a: "Data kamu dienkripsi dan tidak pernah dijual. Kamu pegang kontrol penuh." },
];

function Index() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const ctaPrimary = hasSession ? "/dashboard" : "/auth";
  const ctaPrimaryLabel = hasSession ? "Buka Dashboard" : "Mulai gratis sekarang";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight text-lg flex items-center gap-1.5">
            <span className="size-7 bg-primary text-primary-foreground rounded-lg grid place-items-center text-sm">H</span>
            HealthyU
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#fitur" className="hover:text-foreground">Fitur</a>
            <a href="#cara" className="hover:text-foreground">Cara kerja</a>
            <a href="#testimoni" className="hover:text-foreground">Testimoni</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </div>
          <Link to={ctaPrimary} className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl">
            {hasSession ? "Dashboard" : "Masuk"}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-5 animate-fade-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="size-3" /> Powered by AI · Gratis
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance leading-tight">
            Sahabat sehat berbasis AI untuk hidup yang lebih bermakna.
          </h1>
          <p className="text-muted-foreground text-lg text-balance">
            Catat makanan Indonesia, atur puasa, ikuti jadwal sholat, dan tanya Dr. Healthy
            kapan saja — semua dalam satu app.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to={ctaPrimary} className="text-center bg-primary text-primary-foreground font-semibold py-4 px-6 rounded-2xl shadow-md shadow-primary/20">
              {ctaPrimaryLabel}
            </Link>
            <a href="#fitur" className="text-center bg-card text-foreground font-semibold py-4 px-6 rounded-2xl outline-1 outline-black/10">
              Lihat fitur
            </a>
          </div>
          <div className="flex items-center gap-4 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="size-3.5" /> Data aman
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" /> 4.8 / 5 (1.240+ user)
            </div>
          </div>
        </div>
        <div className="relative animate-fade-up">
          <div className="aspect-[4/5] max-w-sm mx-auto bg-gradient-to-br from-mint via-card to-secondary rounded-[2.5rem] p-6 outline-1 outline-black/5 shadow-xl">
            <div className="space-y-3 h-full flex flex-col">
              <div className="bg-card rounded-2xl p-4 outline-1 outline-black/5">
                <p className="text-xs text-muted-foreground">Hari ini</p>
                <p className="text-2xl font-bold">1.420 <span className="text-sm text-muted-foreground">/ 1.800 kkal</span></p>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "78%" }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[["P", "85g"], ["C", "150g"], ["F", "45g"]].map(([k, v]) => (
                  <div key={k} className="bg-card rounded-xl p-3 text-center outline-1 outline-black/5">
                    <p className="text-[10px] text-muted-foreground">{k}</p>
                    <p className="text-sm font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-2xl p-4 outline-1 outline-black/5 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Dr. Healthy</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kamu sudah 78% target! Coba tambah ayam panggang 100g untuk sore ini agar protein tercapai. 💪
                </p>
              </div>
              <div className="bg-primary text-primary-foreground rounded-2xl p-3 text-center">
                <p className="text-xs font-semibold">🔥 Streak 12 hari</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Semua yang kamu butuh, dalam satu app</h2>
          <p className="text-muted-foreground mt-3">Dirancang untuk gaya hidup Indonesia: dari nasi padang sampai puasa Ramadhan.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="bg-card rounded-2xl p-5 outline-1 outline-black/5 shadow-sm">
              <div className="size-10 bg-mint text-sage-deep rounded-xl grid place-items-center mb-3">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="cara" className="bg-mint/40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Mulai dalam 3 langkah</h2>
            <p className="text-muted-foreground mt-3">Tidak ribet. Hasil terlihat dalam minggu pertama.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-4">
            {STEPS.map(({ n, title, desc }) => (
              <li key={n} className="bg-card rounded-2xl p-6 outline-1 outline-black/5">
                <div className="text-3xl font-bold text-primary mb-2">{n}</div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Dipakai ribuan orang Indonesia</h2>
          <p className="text-muted-foreground mt-3">Cerita nyata dari user HealthyU.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="bg-card rounded-2xl p-6 outline-1 outline-black/5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed mb-4">"{t.quote}"</blockquote>
              <figcaption className="text-xs text-muted-foreground">
                <strong className="text-foreground">{t.name}</strong> · {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-mint/40">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-10">Pertanyaan umum</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="bg-card rounded-2xl p-5 outline-1 outline-black/5 group">
                <summary className="font-semibold cursor-pointer flex items-center justify-between text-sm">
                  {item.q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <div className="bg-gradient-to-br from-primary to-sage-deep text-primary-foreground rounded-3xl p-10 md:p-14 space-y-5 shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
            Mulai perjalanan sehatmu hari ini
          </h2>
          <p className="text-primary-foreground/85 text-balance">
            Gratis selamanya. Tanpa kartu kredit. Hasil terlihat dalam 7 hari pertama.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to={ctaPrimary} className="bg-white text-primary font-semibold py-4 px-6 rounded-2xl">
              {ctaPrimaryLabel}
            </Link>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/80 pt-2">
            <li className="flex items-center gap-1"><Check className="size-3.5" /> Gratis selamanya</li>
            <li className="flex items-center gap-1"><Check className="size-3.5" /> Database makanan Indonesia</li>
            <li className="flex items-center gap-1"><Check className="size-3.5" /> AI coach 24/7</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HealthyU · Dirancang khusus untuk Indonesia</p>
          <div className="flex gap-4">
            <Link to="/auth">Masuk</Link>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
