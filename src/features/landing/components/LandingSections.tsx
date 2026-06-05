import {
  Sparkles,
  Utensils,
  Timer,
  Moon,
  ChefHat,
  MessageCircle,
  Star,
  Check,
  Trophy,
  ArrowRight,
  Flame,
  Zap,
  Heart,
  Camera,
  Users,
  Activity,
  Baby,
} from "lucide-react";
import { StatsCounter } from "./StatsCounter";
import { BeforeAfter } from "./BeforeAfter";

const FEATURES = [
  {
    icon: Camera,
    title: "Scan makanan AI",
    desc: "Foto piringmu — kalori & makro muncul instan.",
    tint: "from-primary/15 to-primary/0",
  },
  {
    icon: Utensils,
    title: "Database lokal Indonesia",
    desc: "Nasi padang, soto, gado-gado — ribuan menu lengkap.",
    tint: "from-accent/15 to-accent/0",
  },
  {
    icon: Timer,
    title: "Puasa cerdas 16:8 & Ramadhan",
    desc: "Timer + reminder sahur & berbuka otomatis.",
    tint: "from-amber-300/20 to-amber-300/0",
  },
  {
    icon: Moon,
    title: "Jadwal sholat & kiblat",
    desc: "Waktu sholat akurat + kompas kiblat berbasis sensor.",
    tint: "from-indigo-400/15 to-indigo-400/0",
  },
  {
    icon: ChefHat,
    title: "Meal plan AI",
    desc: "Rencana mingguan personal sesuai goal & alergi.",
    tint: "from-primary/15 to-primary/0",
  },
  {
    icon: MessageCircle,
    title: "Dr. Healthy chatbot",
    desc: "Tanya jawab AI 24/7 dalam Bahasa Indonesia.",
    tint: "from-accent/15 to-accent/0",
  },
  {
    icon: Trophy,
    title: "Streak & gamifikasi",
    desc: "Level up, koin, achievement — konsisten jadi seru.",
    tint: "from-amber-300/20 to-amber-300/0",
  },
  {
    icon: Heart,
    title: "Vitals & body comp",
    desc: "Lacak berat, tekanan darah, gula, & komposisi tubuh.",
    tint: "from-rose-300/20 to-rose-300/0",
  },
];

const STEPS = [
  { n: "01", title: "Daftar gratis", desc: "Buat akun dalam 30 detik dengan email atau Google." },
  { n: "02", title: "Isi profil & goal", desc: "Kami hitung kebutuhan kalori & makro personalmu." },
  {
    n: "03",
    title: "Catat & dapat insight",
    desc: "Log makanan, ikuti meal plan AI, capai targetmu.",
  },
];

const TESTIMONIALS = [
  {
    name: "Rina, 28",
    city: "Jakarta",
    quote:
      "Turun 6 kg dalam 2 bulan tanpa kelaparan. Meal plan AI-nya pas banget sama selera Indonesia.",
    rating: 5,
  },
  {
    name: "Budi, 35",
    city: "Surabaya",
    quote: "Akhirnya app puasa yang ngerti jadwal Ramadhan. Reminder sahur penyelamat hidup.",
    rating: 5,
  },
  {
    name: "Sari, 24",
    city: "Bandung",
    quote: "Dr. Healthy jawab pertanyaan diet lebih cepat dari nutritionist saya. Worth it banget!",
    rating: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: "Apakah benar-benar gratis?",
    a: "Ya, semua fitur inti gratis. Tidak perlu kartu kredit untuk daftar.",
  },
  {
    q: "Apakah makanan Indonesia lengkap?",
    a: "Database kami berisi ribuan menu lokal: nasi padang, gado-gado, soto, hingga jajanan tradisional.",
  },
  {
    q: "Bagaimana AI coach bekerja?",
    a: "Dr. Healthy menggunakan AI canggih untuk memberi saran berdasarkan profil, riwayat makan, dan goal kamu.",
  },
  {
    q: "Aman untuk data saya?",
    a: "Data kamu dienkripsi dan tidak pernah dijual. Kamu pegang kontrol penuh.",
  },
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

export function TrustMarquee() {
  return (
    <section
      aria-label="Kota pengguna"
      className="border-y border-white/10 bg-card/30 py-4 overflow-hidden"
    >
      <div className="flex gap-12 animate-marquee whitespace-nowrap text-sm font-semibold text-muted-foreground">
        {[...Array(2)].map((_, dup) => (
          <div key={dup} className="flex gap-12 shrink-0">
            {[
              "Jakarta",
              "Surabaya",
              "Bandung",
              "Medan",
              "Makassar",
              "Yogyakarta",
              "Semarang",
              "Denpasar",
              "Palembang",
              "Balikpapan",
            ].map((c) => (
              <span key={c} className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatsStrip() {
  const items = [
    { n: 10000, s: "+", l: "Pengguna aktif", i: Heart },
    { n: 5000, s: "+", l: "Menu Indonesia", i: Utensils },
    { n: 98, s: "%", l: "Akurasi scan AI", i: Camera },
    { n: 24, s: "/7", l: "Dr. Healthy siap", i: MessageCircle },
  ];
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ n, s, l, i: Icon }) => (
        <div key={l} className="glass rounded-2xl p-4 border border-white/15 text-center">
          <Icon className="size-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            <StatsCounter value={n} suffix={s} />
          </p>
          <p className="text-xs text-muted-foreground">{l}</p>
        </div>
      ))}
    </section>
  );
}

export function FeaturesBento() {
  return (
    <section id="fitur" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Zap className="size-3" /> Fitur unggulan
        </span>
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight mt-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Satu app. <span className="text-primary">Semua kebutuhan sehatmu.</span>
        </h2>
        <p className="text-muted-foreground mt-3">
          Dirancang untuk gaya hidup Indonesia: dari nasi padang sampai puasa Ramadhan.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURES.map(({ icon: Icon, title, desc, tint }, i) => (
          <article
            key={title}
            className={`group relative overflow-hidden rounded-2xl p-5 glass border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/10 ${i === 0 ? "sm:col-span-2 sm:row-span-1" : ""}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60 group-hover:opacity-100 transition-opacity`}
            />
            <div className="relative">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary grid place-items-center mb-3 border border-primary/20">
                <Icon className="size-5" />
              </div>
              <h3
                className="font-bold text-sm mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="cara" className="relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent"
      />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2
            className="text-3xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mulai dalam <span className="text-primary">3 langkah</span>
          </h2>
          <p className="text-muted-foreground mt-3">
            Tidak ribet. Hasil terlihat dalam minggu pertama.
          </p>
        </div>
        <ol className="grid md:grid-cols-3 gap-4 relative">
          {STEPS.map(({ n, title, desc }, i) => (
            <li
              key={n}
              className="relative glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span
                  className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {n}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block size-4 text-primary/40 ml-auto" />
                )}
              </div>
              <h3 className="font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section id="testimoni" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cerita nyata, <span className="text-primary">hasil nyata</span>
        </h2>
        <p className="text-muted-foreground mt-3">Cerita nyata dari user HealthyU.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all"
          >
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
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pertanyaan umum
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="glass rounded-2xl p-5 border border-white/15 group hover:border-primary/30 transition-colors"
            >
              <summary className="font-bold cursor-pointer flex items-center justify-between text-sm">
                {item.q}
                <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonTable() {
  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HealthyU vs <span className="text-muted-foreground">yang lain</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Kenapa ribuan orang Indonesia pindah ke HealthyU.
        </p>
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
                    {v === true ? (
                      <Check className="size-4 text-primary" />
                    ) : v === false ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{v}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ForWhom() {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dibuat untuk <span className="text-primary">semua orang</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {AUDIENCES.map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="glass rounded-2xl p-5 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all"
          >
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center mb-3 text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {t}
            </h3>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BeforeAfterSection() {
  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Hasil nyata, <span className="text-primary">geser & lihat</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Transformasi user HealthyU dalam 12 minggu.
        </p>
      </div>
      <BeforeAfter />
    </section>
  );
}

export function FeaturedIn() {
  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
      <p className="text-center text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 inline-flex items-center gap-2 justify-center w-full">
        <Users className="size-3.5" /> Featured in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-70">
        {["Kompas", "Detik", "Tempo", "Tirto", "CNN Indonesia", "IDN Times"].map((m) => (
          <span
            key={m}
            className="font-bold tracking-tight text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {m}
          </span>
        ))}
      </div>
    </section>
  );
}

export function HeroDemoCard() {
  return (
    <div
      className="relative aspect-[4/5] max-w-sm mx-auto rounded-[2.5rem] p-6 shadow-2xl shadow-primary/20 hover-tilt overflow-hidden border border-white/20"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in oklab, var(--mint) 60%, transparent), color-mix(in oklab, var(--card) 90%, transparent) 50%, color-mix(in oklab, var(--accent) 25%, transparent))",
      }}
    >
      <div className="pointer-events-none absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-transparent to-accent/30 blur-xl -z-10" />
      <div className="space-y-3 h-full flex flex-col">
        <div className="glass rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Hari ini</p>
            <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
              78%
            </span>
          </div>
          <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>
            1.420 <span className="text-sm text-muted-foreground font-normal">/ 1.800 kkal</span>
          </p>
          <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent rounded-full"
              style={{ width: "78%" }}
            />
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
            <span className="ml-auto text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">
            Hampir sampai target! Tambah <strong>ayam panggang 100g</strong> sore ini biar protein
            full. 💪
          </p>
        </div>
        <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold inline-flex items-center gap-1.5">
            🔥 Streak 12 hari
          </span>
          <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            Level 4
          </span>
        </div>
      </div>
    </div>
  );
}

const RECIPES = [
  { name: "Nasi Bakar Ayam Suwir", kcal: 420, time: "25m" },
  { name: "Gado-Gado Light", kcal: 310, time: "15m" },
  { name: "Soto Ayam Bening", kcal: 280, time: "30m" },
  { name: "Tumis Tahu Telur", kcal: 350, time: "12m" },
];

export function PopularRecipes({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Resep populer minggu ini
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Diuji dapur lokal, ramah kalori.</p>
        </div>
        <a href={ctaHref} className="hidden sm:inline text-sm font-semibold text-primary">
          Lihat semua →
        </a>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {RECIPES.map((r, i) => (
          <article
            key={r.name}
            className="glass rounded-2xl border border-white/15 overflow-hidden hover:-translate-y-1 transition-all"
          >
            <div
              className="aspect-[4/3]"
              style={{
                background: `linear-gradient(135deg, hsl(${i * 70} 70% 70%), hsl(${i * 70 + 40} 70% 55%))`,
              }}
            />
            <div className="p-4">
              <h3
                className="font-bold text-sm mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {r.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Flame className="size-3 text-amber-500" />
                  {r.kcal} kkal
                </span>
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3" />
                  {r.time}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}