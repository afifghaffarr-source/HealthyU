import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Utensils,
  Timer,
  Moon,
  ChefHat,
  MessageCircle,
  Star,
  Check,
  Shield,
  Trophy,
  ArrowRight,
  Flame,
  Zap,
  Heart,
  Camera,
  X,
  Send,
  Crown,
  Users,
  Activity,
  Baby,
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
  { icon: Camera, title: "Scan makanan AI", desc: "Foto piringmu — kalori & makro muncul instan.", tint: "from-primary/15 to-primary/0" },
  { icon: Utensils, title: "Database lokal Indonesia", desc: "Nasi padang, soto, gado-gado — ribuan menu lengkap.", tint: "from-accent/15 to-accent/0" },
  { icon: Timer, title: "Puasa cerdas 16:8 & Ramadhan", desc: "Timer + reminder sahur & berbuka otomatis.", tint: "from-amber-300/20 to-amber-300/0" },
  { icon: Moon, title: "Jadwal sholat & kiblat", desc: "Waktu sholat akurat + kompas kiblat berbasis sensor.", tint: "from-indigo-400/15 to-indigo-400/0" },
  { icon: ChefHat, title: "Meal plan AI", desc: "Rencana mingguan personal sesuai goal & alergi.", tint: "from-primary/15 to-primary/0" },
  { icon: MessageCircle, title: "Dr. Healthy chatbot", desc: "Tanya jawab AI 24/7 dalam Bahasa Indonesia.", tint: "from-accent/15 to-accent/0" },
  { icon: Trophy, title: "Streak & gamifikasi", desc: "Level up, koin, achievement — konsisten jadi seru.", tint: "from-amber-300/20 to-amber-300/0" },
  { icon: Heart, title: "Vitals & body comp", desc: "Lacak berat, tekanan darah, gula, & komposisi tubuh.", tint: "from-rose-300/20 to-rose-300/0" },
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

const COMPARE = [
  { f: "Database makanan Indonesia", us: true, mfp: "Terbatas", fitbit: false },
  { f: "Puasa Ramadhan & 16:8", us: true, mfp: false, fitbit: "Sebagian" },
  { f: "Jadwal sholat & kiblat", us: true, mfp: false, fitbit: false },
  { f: "AI coach Bahasa Indonesia", us: true, mfp: false, fitbit: false },
  { f: "Scan makanan AI", us: true, mfp: "Premium", fitbit: false },
  { f: "Gratis selamanya", us: true, mfp: false, fitbit: false },
];

const AUDIENCES = [
  { icon: Moon, t: "Muslim", d: "Puasa & jadwal sholat terintegrasi." },
  { icon: Activity, t: "Atlet", d: "Makro presisi & meal-timing." },
  { icon: Heart, t: "Diabetisi", d: "Lacak gula darah & GI makanan." },
  { icon: Baby, t: "Ibu hamil", d: "Nutrisi trimester & vitamin penting." },
];

const RECIPES = [
  { name: "Nasi Bakar Ayam Suwir", kcal: 420, time: "25m" },
  { name: "Gado-Gado Light", kcal: 310, time: "15m" },
  { name: "Soto Ayam Bening", kcal: 280, time: "30m" },
  { name: "Tumis Tahu Telur", kcal: 350, time: "12m" },
];

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return val;
}

function StatsCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const v = useCountUp(value, vis);
  return <span ref={ref}>{v.toLocaleString("id-ID")}{suffix}</span>;
}

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/15 shadow-xl select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-200 to-rose-400 grid place-items-center text-rose-900 font-bold text-2xl">SEBELUM · 78 kg</div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-2xl" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>SESUDAH · 65 kg</div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="absolute inset-x-0 bottom-3 mx-auto w-3/4 accent-white" aria-label="Slider sebelum sesudah" />
      <div className="absolute top-0 bottom-8 w-0.5 bg-white shadow-lg pointer-events-none" style={{ left: `${pos}%` }} />
    </div>
  );
}

function BmrQuiz() {
  const [g, setG] = useState<"m" | "f">("m");
  const [age, setAge] = useState(25);
  const [w, setW] = useState(65);
  const [h, setH] = useState(170);
  const bmr = Math.round(g === "m" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161);
  return (
    <div className="glass rounded-3xl p-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Hitung BMR-mu (gratis, 5 detik)</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <label className="flex flex-col gap-1">Gender
          <select value={g} onChange={(e) => setG(e.target.value as "m" | "f")} className="bg-card border border-white/15 rounded-lg px-2 py-1.5">
            <option value="m">Pria</option><option value="f">Wanita</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">Umur
          <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} className="bg-card border border-white/15 rounded-lg px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">Berat (kg)
          <input type="number" value={w} onChange={(e) => setW(+e.target.value)} className="bg-card border border-white/15 rounded-lg px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">Tinggi (cm)
          <input type="number" value={h} onChange={(e) => setH(+e.target.value)} className="bg-card border border-white/15 rounded-lg px-2 py-1.5" />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-primary/15 to-accent/15 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Kebutuhan basal harian</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{bmr.toLocaleString("id-ID")} <span className="text-sm font-normal text-muted-foreground">kkal</span></p>
        </div>
        <Link to="/auth" className="bg-primary text-primary-foreground font-semibold text-xs px-3 py-2 rounded-xl">Lihat meal plan</Link>
      </div>
    </div>
  );
}

function FloatingChat() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} aria-label="Buka Dr. Healthy" className="fixed bottom-5 right-5 z-40 size-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/40 grid place-items-center hover:scale-105 transition-transform">
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
        {!open && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 animate-pulse" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[90vw] max-w-sm glass rounded-2xl border border-white/20 shadow-2xl p-4 animate-fade-up">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <span className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground"><Sparkles className="size-4" /></span>
            <div><p className="font-bold text-sm">Dr. Healthy</p><p className="text-[10px] text-muted-foreground">AI · biasanya membalas instan</p></div>
          </div>
          <div className="py-3 text-sm space-y-2">
            <p className="bg-muted/60 rounded-2xl rounded-tl-sm px-3 py-2 inline-block">Halo! Aku bisa bantu hitung kalori, susun meal plan, & jawab pertanyaan diet. Daftar dulu yuk?</p>
          </div>
          <Link to="/auth" className="block text-center bg-primary text-primary-foreground font-semibold text-xs py-2.5 rounded-xl">Mulai chat (gratis)</Link>
        </div>
      )}
    </>
  );
}

function Index() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaPrimary = hasSession ? "/dashboard" : "/auth";
  const ctaPrimaryLabel = hasSession ? "Buka Dashboard" : "Mulai gratis sekarang";

  const fireConfetti = () => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hu_confetti")) return;
    sessionStorage.setItem("hu_confetti", "1");
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1600);
  };

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-x-clip">
      {confetti && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} className="absolute top-0 size-2 rounded-sm animate-confetti" style={{
              left: `${Math.random() * 100}%`,
              background: ["#16a34a","#0ea5e9","#f59e0b","#ec4899","#a855f7"][i % 5],
              animationDelay: `${Math.random() * 0.4}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }} />
          ))}
        </div>
      )}
      {/* Animated gradient mesh background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[480px] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 size-[520px] rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "-6s" }} />
        <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-primary-glow/25 blur-3xl animate-blob" style={{ animationDelay: "-12s" }} />
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight text-lg flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <span className="relative size-8 rounded-xl grid place-items-center text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30">
              H
              <span className="absolute -inset-0.5 rounded-xl bg-primary/40 blur-md -z-10" />
            </span>
            HealthyU
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#fitur" className="hover:text-foreground">Fitur</a>
            <a href="#cara" className="hover:text-foreground">Cara kerja</a>
            <a href="#testimoni" className="hover:text-foreground">Testimoni</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </div>
          <Link
            to={ctaPrimary}
            className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow"
          >
            <span className="relative z-10">{hasSession ? "Dashboard" : "Masuk"}</span>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-2 gap-10 items-center relative">
        <div className="space-y-5 animate-fade-up">
          <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 backdrop-blur border border-primary/20 text-xs font-semibold uppercase tracking-wider overflow-hidden">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <Sparkles className="size-3 text-primary" /> Powered by Gemini AI · Gratis selamanya
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance leading-[1.05]" style={{ fontFamily: "var(--font-display)" }}>
            Hidup sehat,{" "}
            <span className="relative inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary-glow animate-aurora">
                ditemani AI
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" fill="none" aria-hidden>
                <path d="M2 7 Q 50 1 100 5 T 198 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary/60" />
              </svg>
            </span>
            <br />yang ngerti Indonesia.
          </h1>
          <p className="text-muted-foreground text-lg text-balance max-w-md">
            Scan piring, atur puasa, lihat jadwal sholat, dan tanya{" "}
            <span className="font-semibold text-foreground">Dr. Healthy</span> kapan saja —
            semua dalam satu app yang ringan & gratis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={ctaPrimary}
              onClick={fireConfetti}
              className="group relative overflow-hidden text-center bg-gradient-to-r from-primary to-primary-dark text-primary-foreground font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <span className="relative z-10 inline-flex items-center gap-2 justify-center">
                {ctaPrimaryLabel}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </Link>
            <a
              href="#fitur"
              className="text-center glass text-foreground font-semibold py-4 px-6 rounded-2xl border border-white/15 hover:border-primary/30 transition-colors"
            >
              Lihat fitur
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {["#16a34a", "#0ea5e9", "#f59e0b", "#ec4899"].map((c) => (
                <span key={c} className="size-7 rounded-full border-2 border-background" style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <strong className="text-foreground">4.8</strong> / 5 · 1.240+ user
            </div>
            <div className="flex items-center gap-1">
              <Shield className="size-3.5 text-primary" /> Data terenkripsi
            </div>
          </div>
        </div>
        <div className="relative animate-fade-up">
          {/* Floating chips around phone */}
          <div className="absolute -top-4 -left-2 z-10 hidden sm:flex items-center gap-2 glass border border-white/15 rounded-2xl px-3 py-2 shadow-lg animate-float">
            <Flame className="size-4 text-amber-500" />
            <div className="text-xs">
              <p className="font-bold leading-none">Streak 12 hari</p>
              <p className="text-muted-foreground">Konsisten!</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-2 z-10 hidden sm:flex items-center gap-2 glass border border-white/15 rounded-2xl px-3 py-2 shadow-lg animate-float" style={{ animationDelay: "-3s" }}>
            <Zap className="size-4 text-primary" />
            <div className="text-xs">
              <p className="font-bold leading-none">+120 poin</p>
              <p className="text-muted-foreground">Goal harian</p>
            </div>
          </div>

          <div className="relative aspect-[4/5] max-w-sm mx-auto rounded-[2.5rem] p-6 shadow-2xl shadow-primary/20 hover-tilt overflow-hidden border border-white/20"
               style={{ background: "linear-gradient(140deg, color-mix(in oklab, var(--mint) 60%, transparent), color-mix(in oklab, var(--card) 90%, transparent) 50%, color-mix(in oklab, var(--accent) 25%, transparent))" }}>
            {/* Glow ring */}
            <div className="pointer-events-none absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-transparent to-accent/30 blur-xl -z-10" />
            <div className="space-y-3 h-full flex flex-col">
              <div className="glass rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Hari ini</p>
                  <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">78%</span>
                </div>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>
                  1.420 <span className="text-sm text-muted-foreground font-normal">/ 1.800 kkal</span>
                </p>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent rounded-full" style={{ width: "78%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Sisa ~380 kkal</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: "Protein", v: "85g", c: "bg-primary" },
                  { k: "Karbo", v: "150g", c: "bg-accent" },
                  { k: "Lemak", v: "45g", c: "bg-amber-500" },
                ].map(({ k, v, c }) => (
                  <div key={k} className="glass rounded-xl p-2.5 text-center border border-white/15">
                    <div className={`size-1.5 ${c} rounded-full mx-auto mb-1`} />
                    <p className="text-[9px] text-muted-foreground font-medium">{k}</p>
                    <p className="text-sm font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-2xl p-4 border border-primary/20 flex-1 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    <Sparkles className="size-3" />
                  </span>
                  <p className="text-sm font-bold">Dr. Healthy</p>
                  <span className="ml-auto text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">AI</span>
                </div>
                <p className="text-xs text-foreground/85 leading-relaxed">
                  Hampir sampai target! Tambah <strong>ayam panggang 100g</strong> sore ini biar protein full. 💪
                </p>
              </div>
              <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold inline-flex items-center gap-1.5">🔥 Streak 12 hari</span>
                <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">Level 4</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust marquee */}
      <section aria-label="Kota pengguna" className="border-y border-white/10 bg-card/30 py-4 overflow-hidden">
        <div className="flex gap-12 animate-marquee whitespace-nowrap text-sm font-semibold text-muted-foreground">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex gap-12 shrink-0">
              {["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Yogyakarta", "Semarang", "Denpasar", "Palembang", "Balikpapan"].map((c) => (
                <span key={c} className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { n: 10000, s: "+", l: "Pengguna aktif", i: Heart },
          { n: 5000, s: "+", l: "Menu Indonesia", i: Utensils },
          { n: 98, s: "%", l: "Akurasi scan AI", i: Camera },
          { n: 24, s: "/7", l: "Dr. Healthy siap", i: MessageCircle },
        ].map(({ n, s, l, i: Icon }) => (
          <div key={l} className="glass rounded-2xl p-4 border border-white/15 text-center">
            <Icon className="size-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}><StatsCounter value={n} suffix={s} /></p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* Features - bento */}
      <section id="fitur" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            <Zap className="size-3" /> Fitur unggulan
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3" style={{ fontFamily: "var(--font-display)" }}>
            Satu app. <span className="text-primary">Semua kebutuhan sehatmu.</span>
          </h2>
          <p className="text-muted-foreground mt-3">Dirancang untuk gaya hidup Indonesia: dari nasi padang sampai puasa Ramadhan.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc, tint }, i) => (
            <article
              key={title}
              className={`group relative overflow-hidden rounded-2xl p-5 glass border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/10 ${i === 0 ? "sm:col-span-2 sm:row-span-1" : ""}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary grid place-items-center mb-3 border border-primary/20">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="cara" className="relative">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Mulai dalam <span className="text-primary">3 langkah</span>
            </h2>
            <p className="text-muted-foreground mt-3">Tidak ribet. Hasil terlihat dalam minggu pertama.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-4 relative">
            {STEPS.map(({ n, title, desc }, i) => (
              <li key={n} className="relative glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 transition-colors">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent" style={{ fontFamily: "var(--font-display)" }}>{n}</span>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden md:block size-4 text-primary/40 ml-auto" />
                  )}
                </div>
                <h3 className="font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Cerita nyata, <span className="text-primary">hasil nyata</span>
          </h2>
          <p className="text-muted-foreground mt-3">Cerita nyata dari user HealthyU.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed mb-4">"{t.quote}"</blockquote>
              <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-xs font-bold">
                  {t.name[0]}
                </span>
                <span>
                  <strong className="text-foreground block">{t.name}</strong>
                  {t.city}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent" />
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-10" style={{ fontFamily: "var(--font-display)" }}>Pertanyaan umum</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="glass rounded-2xl p-5 border border-white/15 group hover:border-primary/30 transition-colors">
                <summary className="font-bold cursor-pointer flex items-center justify-between text-sm">
                  {item.q}
                  <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>HealthyU vs <span className="text-muted-foreground">yang lain</span></h2>
          <p className="text-muted-foreground mt-2 text-sm">Kenapa ribuan orang Indonesia pindah ke HealthyU.</p>
        </div>
        <div className="glass rounded-2xl border border-white/15 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/60">
              <tr className="text-left">
                <th className="p-4 font-semibold">Fitur</th>
                <th className="p-4 font-semibold text-primary">HealthyU</th>
                <th className="p-4 font-semibold text-muted-foreground">MyFitnessPal</th>
                <th className="p-4 font-semibold text-muted-foreground">Fitbit</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.f} className="border-t border-white/10">
                  <td className="p-4 font-medium">{r.f}</td>
                  {[r.us, r.mfp, r.fitbit].map((v, i) => (
                    <td key={i} className="p-4">
                      {v === true ? <Check className="size-4 text-primary" /> : v === false ? <span className="text-muted-foreground">—</span> : <span className="text-xs text-muted-foreground">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Untuk siapa */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Dibuat untuk <span className="text-primary">semua orang</span></h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AUDIENCES.map(({ icon: Icon, t, d }) => (
            <div key={t} className="glass rounded-2xl p-5 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all">
              <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center mb-3 text-primary"><Icon className="size-5" /></div>
              <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{t}</h3>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BMR Quiz */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <BmrQuiz />
      </section>

      {/* Resep populer */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Resep populer minggu ini</h2>
            <p className="text-muted-foreground text-sm mt-1">Diuji dapur lokal, ramah kalori.</p>
          </div>
          <Link to={ctaPrimary} className="hidden sm:inline text-sm font-semibold text-primary">Lihat semua →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RECIPES.map((r, i) => (
            <article key={r.name} className="glass rounded-2xl border border-white/15 overflow-hidden hover:-translate-y-1 transition-all">
              <div className="aspect-[4/3]" style={{ background: `linear-gradient(135deg, hsl(${i * 70} 70% 70%), hsl(${i * 70 + 40} 70% 55%))` }} />
              <div className="p-4">
                <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{r.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-3"><span className="inline-flex items-center gap-1"><Flame className="size-3 text-amber-500" />{r.kcal} kkal</span><span className="inline-flex items-center gap-1"><Timer className="size-3" />{r.time}</span></p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Hasil nyata, <span className="text-primary">geser & lihat</span></h2>
          <p className="text-muted-foreground mt-2 text-sm">Transformasi user HealthyU dalam 12 minggu.</p>
        </div>
        <BeforeAfter />
      </section>

      {/* Pricing teaser */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-3xl p-7 border border-primary/30">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">Gratis</span>
            <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>Rp 0 <span className="text-sm font-normal text-muted-foreground">/ selamanya</span></h3>
            <ul className="text-sm space-y-2 mt-4 text-muted-foreground">
              {["Scan makanan AI","Meal plan personal","Puasa & jadwal sholat","Dr. Healthy chatbot"].map((x) => <li key={x} className="flex items-center gap-2"><Check className="size-4 text-primary" />{x}</li>)}
            </ul>
            <Link to={ctaPrimary} className="mt-5 block text-center bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Mulai gratis</Link>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-7 shadow-xl">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full"><Crown className="size-3" /> Premium (segera)</span>
            <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>Rp 29rb <span className="text-sm font-normal opacity-80">/ bulan</span></h3>
            <ul className="text-sm space-y-2 mt-4 opacity-95">
              {["Konsultasi nutritionist real","Resep premium tanpa batas","Export laporan PDF","Sinkron Apple/Google Fit"].map((x) => <li key={x} className="flex items-center gap-2"><Check className="size-4" />{x}</li>)}
            </ul>
            <button className="mt-5 w-full text-center bg-white text-primary font-semibold py-3 rounded-xl">Notify saya</button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <div className="glass rounded-3xl p-7 border border-white/15 text-center">
          <h3 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Dapat <span className="text-primary">ebook Meal Plan 7 hari</span> gratis</h3>
          <p className="text-sm text-muted-foreground mt-2">Masukkan email — kirim PDF langsung ke inbox.</p>
          {subscribed ? (
            <p className="mt-4 text-primary font-semibold inline-flex items-center gap-2"><Check className="size-4" /> Cek inbox kamu ya!</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email) setSubscribed(true); }} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="flex-1 bg-card border border-white/15 rounded-xl px-4 py-3 text-sm" />
              <button className="bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-xl inline-flex items-center justify-center gap-2"><Send className="size-4" /> Kirim</button>
            </form>
          )}
        </div>
      </section>

      {/* Featured in */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <p className="text-center text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 inline-flex items-center gap-2 justify-center w-full"><Users className="size-3.5" /> Featured in</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-70">
          {["Kompas","Detik","Tempo","Tirto","CNN Indonesia","IDN Times"].map((m) => (
            <span key={m} className="font-bold tracking-tight text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>{m}</span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-10 md:p-14 space-y-5 shadow-2xl shadow-primary/30">
          <div aria-hidden className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative text-3xl md:text-5xl font-bold tracking-tight text-balance" style={{ fontFamily: "var(--font-display)" }}>
            Mulai perjalanan sehatmu hari ini
          </h2>
          <p className="relative text-primary-foreground/85 text-balance">
            Gratis selamanya. Tanpa kartu kredit. Hasil terlihat dalam 7 hari pertama.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to={ctaPrimary} onClick={fireConfetti} className="group inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold py-4 px-6 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-transform">
              {ctaPrimaryLabel}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <ul className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/80 pt-2">
            <li className="flex items-center gap-1"><Check className="size-3.5" /> Gratis selamanya</li>
            <li className="flex items-center gap-1"><Check className="size-3.5" /> Database makanan Indonesia</li>
            <li className="flex items-center gap-1"><Check className="size-3.5" /> AI coach 24/7</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HealthyU · Dirancang khusus untuk Indonesia</p>
          <div className="flex gap-4">
            <Link to="/auth">Masuk</Link>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>

      {/* Sticky CTA bar */}
      <div className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-40 transition-all ${showStickyCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}>
        <div className="glass border border-white/20 shadow-2xl rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
          <span className="text-xs font-semibold hidden sm:inline">Siap memulai? Gratis selamanya.</span>
          <Link to={ctaPrimary} onClick={fireConfetti} className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
            {hasSession ? "Dashboard" : "Mulai"} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <FloatingChat />
    </main>
  );
}
