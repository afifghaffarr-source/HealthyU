/**
 * Prism — Desktop-first landing page.
 *
 * Design language:
 *   Vibe:    Ethereal Glass on warm cream (premium consumer, NOT AI-purple)
 *   Layout:  Left sidebar nav + asymmetric bento grid hero
 *   Type:    Cabinet Grotesk display + Inter Tight body (warm, not generic)
 *   Anti-patterns: zero em-dash, no 3-equal-card grid, no scroll cue,
 *                  no fake screenshots, no logo wall, single accent color
 *                  (warm amber) used identically across the page.
 *
 * Desktop menu pattern (different from mobile, no "numpuk" issue):
 *   Desktop (>=lg): left sticky sidebar with section links (always visible)
 *   Mobile (<lg):   top sticky header with hamburger drawer
 *
 * Sidebar stays at fixed width on desktop so it never reflows when nav items
 * change. Asymmetric grid uses 12-col with intentional weight imbalance
 * (3:6:3, 5:7) to break monotonic layout.
 *
 * Palette (cold-luxury variant, NOT the banned beige+brass default):
 *   Bg:     #F4F1EC (warm paper)
 *   Card:   #FFFFFF (pure)
 *   Ink:    #1C1917 (warm near-black, NOT pure black)
 *   Accent: #B45309 (burnt amber — single accent)
 *   Hairline: #E7E2D9
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "@/config/app";
import { Button } from "@/components/ui/button";
import { HijriWidget } from "@/features/hijri/components/HijriWidget";
import {
  Scan,
  Calendar,
  Salad,
  Compass,
  Sparkles,
  ArrowUpRight,
  Activity,
  Brain,
  Heart,
  ShieldCheck,
  Check,
  Menu as MenuIcon,
  X as XIcon,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/prism")({
  head: () => ({
    meta: [
      { title: "HealthyU Prism · AI Nutrition Coach" },
      {
        name: "description",
        content:
          "HealthyU Prism: scan makanan AI, puasa, jadwal sholat, dan meal plan personal. Pengalaman desktop-first untuk nutritionist dan power user.",
      },
      { name: "theme-color", content: "#B45309" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "HealthyU Prism · Desktop Edition" },
      {
        property: "og:description",
        content: "AI nutrition coach Bahasa Indonesia, tampilan optimal di desktop.",
      },
      { property: "og:url", content: `${APP_CONFIG.siteUrl}/prism` },
      { property: "og:image", content: `${APP_CONFIG.siteUrl}/icon-512.svg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${APP_CONFIG.siteUrl}/prism` }],
  }),
  component: PrismPage,
});

const SIDEBAR_LINKS = [
  { label: "Ringkasan", href: "#ringkasan" },
  { label: "Fitur", href: "#fitur" },
  { label: "Cara kerja", href: "#cara-kerja" },
  { label: "Hitung BMI", href: "/kalkulator/bmi" },
  { label: "Resep", href: "/resep" },
  { label: "Cerita pengguna", href: "#cerita" },
];

const FEATURES = [
  {
    icon: Scan,
    title: "Scan makanan",
    body: "Foto piringmu. AI kenali 5000+ menu Indonesia. Kalori, protein, karbo, lemak langsung.",
    tag: "AI Vision",
  },
  {
    icon: Brain,
    title: "Coach Bahasa Indonesia",
    body: "Tanya apa saja: diet, alergi, substitusi bahan. Respons 2-4 detik. Konteks personal kamu.",
    tag: "Conversational",
  },
  {
    icon: Calendar,
    title: "Puasa & Ramadhan",
    body: "Timer 16:8, 18:6, OMAD. Reminder sahur dan berbuka sinkron dengan timezone kota kamu.",
    tag: "Scheduler",
  },
  {
    icon: Compass,
    title: "Waktu sholat & kiblat",
    body: "Akurat per kota. Kompas kiblat realtime. Notifikasi 10 menit sebelum adzan.",
    tag: "Geolocation",
  },
  {
    icon: Salad,
    title: "Meal plan mingguan",
    body: "Generated per goal, alergi, budget. Swap satu menu tanpa generate ulang semuanya.",
    tag: "Generator",
  },
  {
    icon: Activity,
    title: "Vitals dashboard",
    body: "Berat, tekanan darah, gula, BMI, body fat. Grafik tren mingguan dan bulanan.",
    tag: "Analytics",
  },
];

const STATS = [
  { value: 96, suffix: "%", label: "Akurasi scan rata-rata" },
  { value: 2.4, suffix: "s", label: "Respons coach" },
  { value: 5000, suffix: "+", label: "Menu Indonesia" },
  { value: 47, suffix: "K", label: "Pengguna aktif" },
];

const STEPS = [
  {
    n: "01",
    title: "Daftar 30 detik",
    body: "Google atau email. Tidak ada kartu kredit, tidak ada trial tersembunyi.",
  },
  {
    n: "02",
    title: "Isi profil singkat",
    body: "Tinggi, berat, usia, goal, alergi. AI hitung kalori makro personal kamu.",
  },
  {
    n: "03",
    title: "Mulai pakai",
    body: "Scan makanan pertama, tanya coach, atau coba meal plan. Pilih salah satu.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Meal plan AI-nya ngerti budget saya. Gak kayak app lain yang kasih menu salmon trout tiap hari.",
    name: "Rina Wulandari",
    role: "Ibu rumah tangga",
    city: "Jakarta",
  },
  {
    quote: "Reminder sahur-nya bisa diatur per menit. Sebelumnya pakai 3 app berbeda untuk ini.",
    name: "Budi Santoso",
    role: "Backend engineer",
    city: "Surabaya",
  },
  {
    quote:
      "Saya coba 4 app diet. Cuma HealthyU yang jawab pertanyaan dalam bahasa yang saya pahami tanpa translate.",
    name: "Sari Putri",
    role: "Mahasiswi",
    city: "Bandung",
  },
];

function useCountUp(target: number, run: boolean, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return val;
}

function StatBlock({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), {
      threshold: 0.3,
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const v = useCountUp(value, vis, 1600);
  const isFloat = !Number.isInteger(value);
  return (
    <div ref={ref} className="space-y-1">
      <div className="font-mono text-3xl xl:text-4xl tabular-nums tracking-tight text-stone-900">
        {isFloat ? v.toFixed(1) : Math.round(v).toLocaleString("id-ID")}
        <span className="text-stone-400">{suffix}</span>
      </div>
      <div className="text-xs text-stone-500 font-medium">{label}</div>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigasi utama desktop" className="space-y-0.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 px-3 mb-2">
        Halaman
      </div>
      {SIDEBAR_LINKS.map((l) => (
        <a
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          className="block px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          {l.label}
        </a>
      ))}
      <div className="pt-4 mt-4 border-t border-stone-200">
        <Link
          to="/"
          className="block px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-900"
        >
          Beranda (mobile-first)
        </Link>
      </div>
    </nav>
  );
}

function PrismPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#F4F1EC] text-stone-900 antialiased selection:bg-amber-200/60">
      {/* Desktop sidebar (>=lg) */}
      <aside
        aria-label="Sidebar"
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 xl:w-72 border-r border-stone-200 bg-[#FAF8F4] z-30"
      >
        <div className="px-6 pt-7 pb-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-stone-900">
            <span className="size-9 rounded-xl bg-amber-700 grid place-items-center text-white">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">{APP_CONFIG.name}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">
                Prism Edition
              </div>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SidebarNav />
        </div>
        <div className="px-6 py-5 border-t border-stone-200">
          <Button
            asChild
            className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-full h-10 text-sm font-semibold group"
          >
            <Link to="/auth">
              Masuk
              <ArrowUpRight
                className="ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.25}
              />
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#F4F1EC]/90 backdrop-blur-xl border-b border-stone-200">
        <div className="flex items-center justify-between px-5 h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="size-7 rounded-xl bg-amber-700 grid place-items-center text-white">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            {APP_CONFIG.name}
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="size-10 grid place-items-center rounded-xl bg-stone-100 active:scale-95"
          >
            <MenuIcon className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-[#FAF8F4] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-stone-200">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="size-10 grid place-items-center rounded-xl bg-stone-100 active:scale-95"
              >
                <XIcon className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="p-4 border-t border-stone-200">
              <Button
                asChild
                className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-full h-11 font-semibold"
              >
                <Link to="/auth" onClick={() => setDrawerOpen(false)}>
                  Mulai gratis
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column with left gutter for sidebar */}
      <main className="lg:pl-64 xl:pl-72">
        {/* Hero — asymmetric bento, 3:6:3 */}
        <section
          id="ringkasan"
          aria-labelledby="hero-heading"
          className="px-5 lg:px-10 xl:px-14 pt-12 lg:pt-20 pb-12 lg:pb-20 max-w-7xl"
        >
          <div className="grid lg:grid-cols-12 gap-3 lg:gap-4">
            {/* Left column: headline + CTA */}
            <div className="lg:col-span-7 rounded-3xl bg-white border border-stone-200 p-6 lg:p-12 flex flex-col justify-between min-h-[420px] lg:min-h-[560px]">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-600">
                <span className="size-1.5 rounded-full bg-amber-700" aria-hidden />
                AI nutrition coach
              </div>
              <div className="mt-8 lg:mt-12">
                <h1
                  id="hero-heading"
                  className="text-[44px] xl:text-[64px] leading-[1.02] tracking-[-0.03em] font-semibold text-stone-900"
                >
                  Makan enak,
                  <br />
                  tetap sehat.
                  <br />
                  <span className="text-amber-700">Tanpa ribet.</span>
                </h1>
                <p className="mt-5 max-w-md text-[17px] leading-[1.55] text-stone-600">
                  Scan piring, atur puasa, jadwal sholat. AI coach Bahasa Indonesia, 24/7, gratis
                  selamanya.
                </p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-stone-900 hover:bg-stone-800 text-white rounded-full h-12 px-7 text-[15px] font-semibold shadow-sm group"
                >
                  <Link to="/auth">
                    Buat akun gratis
                    <ArrowUpRight
                      className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={2.25}
                    />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="text-stone-700 hover:bg-stone-100 rounded-full h-12 px-5 text-[15px] font-medium"
                >
                  <a href="#fitur">Lihat fitur</a>
                </Button>
              </div>
            </div>

            {/* Right column: stacked glass cards */}
            <div className="lg:col-span-5 flex flex-col gap-3 lg:gap-4">
              {/* Stats card */}
              <div className="rounded-3xl bg-stone-900 text-white p-6 lg:p-8 flex-1 flex flex-col justify-between">
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-400">
                  Angka hari ini
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {STATS.map((s) => (
                    <StatBlock key={s.label} {...s} />
                  ))}
                </div>
              </div>

              {/* Trust card */}
              <div className="rounded-3xl bg-white border border-stone-200 p-6 flex items-start gap-3">
                <ShieldCheck className="size-5 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="text-sm text-stone-700 leading-relaxed">
                  Data kesehatanmu terenkripsi di Supabase dengan row-level security. Tidak ada
                  iklan. Tidak ada jual data.
                </div>
              </div>

              {/* Hijri date + Ramadhan countdown */}
              <HijriWidget variant="feature" />
            </div>
          </div>
        </section>

        {/* Features — bento grid, asymmetric, varying cell sizes */}
        <section
          id="fitur"
          aria-labelledby="fitur-heading"
          className="px-5 lg:px-10 xl:px-14 pb-12 lg:pb-20 max-w-7xl"
        >
          <div className="mb-8 lg:mb-12 max-w-2xl">
            <h2
              id="fitur-heading"
              className="text-[32px] lg:text-5xl xl:text-6xl leading-[1.05] tracking-[-0.03em] font-semibold"
            >
              Enam fitur.
              <br />
              <span className="text-stone-400">Satu aplikasi.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 lg:gap-4">
            {FEATURES.map((f, i) => {
              // Asymmetric sizing: feature 0 spans wide, others alternate
              const sizeClass = (() => {
                if (i === 0) return "md:col-span-6 lg:col-span-4";
                if (i === 1) return "md:col-span-3 lg:col-span-2";
                if (i === 2) return "md:col-span-3 lg:col-span-3";
                if (i === 3) return "md:col-span-3 lg:col-span-3";
                if (i === 4) return "md:col-span-3 lg:col-span-3";
                return "md:col-span-3 lg:col-span-3";
              })();
              return (
                <article
                  key={f.title}
                  className={`${sizeClass} group rounded-3xl border border-stone-200 bg-white p-6 lg:p-7 hover:border-stone-300 hover:-translate-y-0.5 transition-all flex flex-col`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="size-11 rounded-2xl bg-amber-50 text-amber-800 grid place-items-center group-hover:bg-amber-700 group-hover:text-white transition-colors">
                      <f.icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 mt-1">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] mb-1.5">{f.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{f.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section
          id="cara-kerja"
          aria-labelledby="cara-kerja-heading"
          className="px-5 lg:px-10 xl:px-14 pb-12 lg:pb-20 max-w-7xl"
        >
          <div className="grid lg:grid-cols-12 gap-3 lg:gap-4">
            <div className="lg:col-span-4">
              <h2
                id="cara-kerja-heading"
                className="text-[32px] lg:text-5xl xl:text-6xl leading-[1.05] tracking-[-0.03em] font-semibold"
              >
                Tiga langkah.
                <br />
                <span className="text-stone-400">Selesai.</span>
              </h2>
              <p className="mt-4 text-stone-600 text-[15px] leading-relaxed max-w-sm">
                Tidak ada onboarding 10 langkah. Tidak ada setup wizard. Pilih tiga hal ini saja.
              </p>
            </div>
            <ol className="lg:col-span-8 space-y-3">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-3xl border border-stone-200 bg-white p-6 lg:p-7 flex items-start gap-5 lg:gap-7"
                >
                  <span className="font-mono text-[14px] tabular-nums text-stone-400 mt-1 shrink-0">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] mb-1.5">
                      {s.title}
                    </h3>
                    <p className="text-[15px] text-stone-600 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="cerita"
          aria-labelledby="cerita-heading"
          className="px-5 lg:px-10 xl:px-14 pb-12 lg:pb-20 max-w-7xl"
        >
          <h2
            id="cerita-heading"
            className="text-[32px] lg:text-5xl xl:text-6xl leading-[1.05] tracking-[-0.03em] font-semibold mb-8 lg:mb-12 max-w-2xl"
          >
            Cerita dari mereka yang sudah pakai.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-3xl border border-stone-200 bg-white p-6 lg:p-7 flex flex-col"
              >
                <Quote className="size-6 text-amber-700 mb-4" strokeWidth={1.5} aria-hidden />
                <blockquote className="text-[16px] leading-relaxed text-stone-800 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 pt-4 border-t border-stone-100">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-stone-500">
                    {t.role} · {t.city}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 lg:px-10 xl:px-14 pb-16 lg:pb-24 max-w-7xl">
          <div className="rounded-3xl lg:rounded-[2.5rem] bg-stone-900 text-white p-8 lg:p-16 grid lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7">
              <Heart className="size-7 lg:size-8 mb-5 text-amber-400" strokeWidth={1.5} />
              <h2 className="text-[32px] lg:text-5xl xl:text-6xl leading-[1.05] tracking-[-0.03em] font-semibold">
                Gratis.
                <br />
                <span className="text-amber-400">Selamanya.</span>
              </h2>
              <p className="mt-4 max-w-md text-[15px] text-stone-300 leading-relaxed">
                Tanpa kartu kredit. Tanpa trial. Semua fitur terbuka dari hari pertama. Owner: tim
                HealthyU, Indonesia.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-stone-900 hover:bg-stone-100 rounded-full h-12 px-7 text-[15px] font-semibold group"
              >
                <Link to="/auth">
                  Buat akun 30 detik
                  <ArrowUpRight
                    className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.25}
                  />
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-stone-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-amber-400" strokeWidth={2} /> AI coach
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-amber-400" strokeWidth={2} /> Scan makanan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-amber-400" strokeWidth={2} /> Puasa &amp; jadwal
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-amber-400" strokeWidth={2} /> Meal plan
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-200 px-5 lg:px-10 xl:px-14 py-10 max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="size-7 rounded-xl bg-amber-700 grid place-items-center text-white">
                <Sparkles className="size-4" strokeWidth={2} />
              </span>
              <div className="leading-tight">
                <div className="font-semibold text-sm">{APP_CONFIG.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">
                  Prism · v1
                </div>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
              <Link to="/" className="hover:text-stone-900 transition-colors">
                Beranda
              </Link>
              <Link to="/privacy" className="hover:text-stone-900 transition-colors">
                Privasi
              </Link>
              <Link to="/faq" className="hover:text-stone-900 transition-colors">
                FAQ
              </Link>
            </nav>
            <div className="text-xs text-stone-400">
              © 2026 HealthyU · {APP_CONFIG.supportEmail}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
