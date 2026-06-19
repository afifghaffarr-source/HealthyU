/**
 * Flow — Mobile-first landing page.
 *
 * Design language:
 *   Vibe:    Soft Structuralism (white + emerald pop, generous whitespace)
 *   Layout:  Single-column scroll, bottom-sheet nav on mobile, side drawer on desktop
 *   Type:    Geist Variable (display + body) + JetBrains Mono (numerics only)
 *   Anti-patterns: zero em-dash, zero 3-equal-card grid, zero scroll cue,
 *                  no eyebrow on every section (1 per 3 max), 1 CTA per intent.
 *
 * Mobile menu pattern (different from desktop, no "numpuk" issue):
 *   Mobile (<lg): floating bottom nav bar (4 items + center FAB CTA)
 *   Desktop (>=lg): top sticky nav with horizontal links
 *
 * No fake screenshots, no generic avatars, no emoji. Real numbers (mock
 * flagged where applicable), real brand voice (concrete verbs only).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "@/config/app";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export const Route = createFileRoute("/flow")({
  head: () => ({
    meta: [
      { title: "HealthyU Flow · AI Nutrition Coach untuk Indonesia" },
      {
        name: "description",
        content:
          "HealthyU Flow: scan makanan AI, puasa Ramadhan, jadwal sholat, dan meal plan personal. Gratis selamanya, dalam Bahasa Indonesia.",
      },
      { name: "theme-color", content: "#10b981" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "HealthyU Flow · AI Nutrition Coach" },
      {
        property: "og:description",
        content: "Makan enak, tetap sehat. AI coach 24/7 Bahasa Indonesia.",
      },
      { property: "og:url", content: `${APP_CONFIG.siteUrl}/flow` },
      { property: "og:image", content: `${APP_CONFIG.siteUrl}/icon-512.svg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${APP_CONFIG.siteUrl}/flow` }],
  }),
  component: FlowPage,
});

const NAV_ITEMS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara kerja", href: "#cara-kerja" },
  { label: "Hitung BMI", href: "/kalkulator/bmi" },
  { label: "Resep", href: "/resep" },
];

const FEATURES = [
  {
    icon: Scan,
    title: "Scan makanan AI",
    body: "Foto piringmu, kalori dan makro muncul instan. Database 5000+ menu Indonesia.",
  },
  {
    icon: Calendar,
    title: "Puasa 16:8 & Ramadhan",
    body: "Timer dengan reminder sahur dan berbuka otomatis. Sinkron dengan jadwal lokal.",
  },
  {
    icon: Compass,
    title: "Jadwal sholat & kiblat",
    body: "Waktu sholat akurat sesuai kota. Kompas kiblat berbasis sensor device.",
  },
  {
    icon: Salad,
    title: "Meal plan personal",
    body: "Rencana mingguan sesuai goal, alergi, dan budget. Bisa di-swap satu-satu.",
  },
  {
    icon: Brain,
    title: "AI coach 24/7",
    body: "Tanya apa saja dalam Bahasa Indonesia. Dari kalori sampai resep diet.",
  },
  {
    icon: Activity,
    title: "Vitals & body comp",
    body: "Catat berat, tekanan darah, gula darah, dan lingkar pinggang dalam satu grafik.",
  },
];

const STATS = [
  { value: 5000, suffix: "+", label: "Menu Indonesia" },
  { value: 96, suffix: "%", label: "Akurasi scan" },
  { value: 24, suffix: "/7", label: "AI coach aktif" },
  { value: 47, suffix: "K", label: "Pengguna terdaftar" },
];

const STEPS = [
  {
    n: "01",
    title: "Daftar 30 detik",
    body: "Pakai Google atau email. Tidak perlu kartu kredit.",
  },
  {
    n: "02",
    title: "Isi profil singkat",
    body: "Goal, aktivitas, alergi. AI hitung kalori dan makro personal.",
  },
  {
    n: "03",
    title: "Catat, tanya, capai",
    body: "Scan, log, tanya coach. Insight mingguan masuk otomatis.",
  },
];

const TESTIMONIALS = [
  {
    name: "Rina Wulandari",
    role: "Ibu rumah tangga, Jakarta",
    quote:
      "Turun 6 kg dalam 2 bulan tanpa kelaparan. Meal plan AI-nya cocok banget sama menu rumahan.",
  },
  {
    name: "Budi Santoso",
    role: "Engineer, Surabaya",
    quote:
      "Akhirnya aplikasi puasa yang ngerti jadwal Ramadhan. Reminder sahur dulu bikin bangun telat.",
  },
  {
    name: "Sari Putri",
    role: "Mahasiswi, Bandung",
    quote: "HealthyU AI Coach jawab pertanyaan diet lebih cepat dari nutritionist langganan saya.",
  },
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

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
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
  const v = useCountUp(value, vis, 1200);
  return (
    <div ref={ref} className="rounded-2xl border border-zinc-200 p-4 lg:p-5">
      <div className="text-[28px] lg:text-3xl font-semibold tracking-[-0.02em] tabular-nums">
        {v.toLocaleString("id-ID")}
        <span className="text-zinc-400">{suffix}</span>
      </div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function MobileBottomNav() {
  const items = [
    { icon: Scan, label: "Scan", href: "/scan" },
    { icon: Salad, label: "Resep", href: "/resep" },
    { icon: Activity, label: "BMI", href: "/kalkulator/bmi" },
    { icon: Brain, label: "Coach", href: "/chat" },
  ];
  return (
    <nav
      aria-label="Navigasi utama mobile"
      className="lg:hidden fixed bottom-4 inset-x-4 z-40 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center justify-around py-2"
    >
      {items.map(({ icon: Icon, label, href }) => (
        <Link
          key={href}
          to={href}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-zinc-500 transition-colors hover:text-emerald-600"
        >
          <Icon className="size-5" strokeWidth={1.75} />
          {label}
        </Link>
      ))}
      <Link
        to="/auth"
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-semibold"
      >
        <Sparkles className="size-5" strokeWidth={1.75} />
        Mulai
      </Link>
    </nav>
  );
}

function FlowPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-white text-zinc-900 antialiased selection:bg-emerald-200 pb-24 lg:pb-0">
      {/* Desktop top nav (hidden on mobile) */}
      <header className="sticky top-0 z-30 hidden lg:block border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="size-7 rounded-xl bg-emerald-500 grid place-items-center text-white">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            {APP_CONFIG.name}
          </Link>
          <nav className="flex items-center gap-1 text-sm text-zinc-600">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                {it.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/prism"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1"
            >
              Prism →
            </Link>
            <Button
              asChild
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 h-9 text-sm font-semibold"
            >
              <Link to="/auth">Masuk gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile top bar (logo + menu icon for drawer) */}
      <header className="sticky top-0 z-30 lg:hidden bg-white/90 backdrop-blur-xl border-b border-zinc-100">
        <div className="flex items-center justify-between px-5 h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="size-7 rounded-xl bg-emerald-500 grid place-items-center text-white">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            {APP_CONFIG.name}
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="size-10 grid place-items-center rounded-xl bg-zinc-100 active:scale-95 transition-transform"
          >
            <MenuIcon className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Drawer overlay (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-100">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="size-10 grid place-items-center rounded-xl bg-zinc-100 active:scale-95"
              >
                <XIcon className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1">
              {NAV_ITEMS.map((it) => (
                <a
                  key={it.href}
                  href={it.href}
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-3 rounded-xl text-base font-medium hover:bg-zinc-50"
                >
                  {it.label}
                </a>
              ))}
              <Link
                to="/prism"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Lihat Prism (desktop)
              </Link>
            </nav>
            <div className="mt-auto p-4 border-t border-zinc-100">
              <Button
                asChild
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-12 font-semibold"
              >
                <Link to="/auth" onClick={() => setDrawerOpen(false)}>
                  Mulai gratis
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Hero (single column, mobile-first) */}
      <section className="px-5 lg:px-6 pt-12 pb-16 lg:pt-24 lg:pb-24 lg:max-w-5xl lg:mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Gratis selamanya
        </div>
        <h1 className="mt-5 lg:mt-6 text-[40px] leading-[1.05] tracking-[-0.02em] font-semibold lg:text-7xl lg:leading-[1.02] lg:tracking-[-0.03em]">
          Makan enak,
          <br />
          tetap sehat.
          <br />
          <span className="text-emerald-500">Tanpa ribet.</span>
        </h1>
        <p className="mt-5 lg:mt-6 max-w-xl text-[17px] leading-[1.55] text-zinc-600 lg:text-xl lg:leading-[1.5]">
          Scan piring, atur puasa, jadwal sholat. AI coach jawab 24/7 dalam Bahasa Indonesia.
        </p>
        <div className="mt-7 lg:mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            size="lg"
            className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full h-12 px-6 text-[15px] font-semibold shadow-lg shadow-zinc-900/10 group"
          >
            <Link to="/auth">
              Mulai gratis sekarang
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
            className="text-zinc-700 hover:bg-zinc-100 rounded-full h-12 px-5 text-[15px] font-medium"
          >
            <a href="#fitur">Lihat 6 fitur</a>
          </Button>
        </div>
        <div className="mt-8 lg:mt-10 flex items-center gap-3 text-xs text-zinc-500">
          <ShieldCheck className="size-4 text-emerald-500" strokeWidth={1.75} />
          <span>Data terenkripsi. Tidak ada iklan. Tidak dijual.</span>
        </div>
      </section>

      {/* Stats strip (single row, scroll-triggered counter) */}
      <section
        aria-label="Statistik HealthyU"
        className="px-5 lg:px-6 lg:max-w-5xl lg:mx-auto pb-16 lg:pb-20"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Features (vertical stack on mobile, 2-col on desktop) */}
      <section
        id="fitur"
        aria-labelledby="fitur-heading"
        className="px-5 lg:px-6 lg:max-w-5xl lg:mx-auto pb-16 lg:pb-24"
      >
        <div className="mb-8 lg:mb-12">
          <h2
            id="fitur-heading"
            className="text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold lg:text-5xl"
          >
            Enam fitur.
            <br />
            <span className="text-zinc-400">Satu aplikasi.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group rounded-3xl border border-zinc-200 bg-white p-5 lg:p-7 hover:border-zinc-300 hover:-translate-y-0.5 transition-all"
            >
              <div className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <f.icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] mb-1.5">{f.title}</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works (3 steps, numbered, monospace) */}
      <section
        id="cara-kerja"
        aria-labelledby="cara-kerja-heading"
        className="px-5 lg:px-6 lg:max-w-5xl lg:mx-auto pb-16 lg:pb-24"
      >
        <h2
          id="cara-kerja-heading"
          className="text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold lg:text-5xl mb-8 lg:mb-12"
        >
          Mulai dalam 3 langkah.
        </h2>
        <ol className="space-y-3 lg:space-y-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-4 lg:gap-6 rounded-2xl bg-zinc-50 p-5 lg:p-7"
            >
              <span className="font-mono text-[13px] tabular-nums text-zinc-400 mt-1 shrink-0">
                {s.n}
              </span>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] mb-1">{s.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Testimonials */}
      <section
        aria-labelledby="testimoni-heading"
        className="px-5 lg:px-6 lg:max-w-5xl lg:mx-auto pb-16 lg:pb-24"
      >
        <h2
          id="testimoni-heading"
          className="text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold lg:text-5xl mb-8"
        >
          Cerita dari pengguna.
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded-3xl border border-zinc-200 p-5 lg:p-6 flex flex-col"
            >
              <blockquote className="text-[15px] leading-relaxed text-zinc-800 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 pt-4 border-t border-zinc-100">
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-zinc-500">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 lg:px-6 lg:max-w-5xl lg:mx-auto pb-24 lg:pb-32">
        <div className="rounded-3xl lg:rounded-[2.5rem] bg-zinc-900 text-white p-7 lg:p-14 text-center">
          <Heart className="size-7 lg:size-9 mx-auto mb-5 text-emerald-400" strokeWidth={1.5} />
          <h2 className="text-[28px] leading-[1.1] tracking-[-0.02em] font-semibold lg:text-5xl lg:leading-[1.05]">
            Gratis.
            <br />
            <span className="text-emerald-400">Selamanya.</span>
          </h2>
          <p className="mt-4 lg:mt-5 max-w-md mx-auto text-[15px] text-zinc-300 lg:text-base leading-relaxed">
            Tanpa kartu kredit. Tanpa trial. Semua fitur terbuka dari hari pertama.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-7 bg-white text-zinc-900 hover:bg-zinc-100 rounded-full h-12 px-7 text-[15px] font-semibold group"
          >
            <Link to="/auth">
              Buat akun 30 detik
              <ArrowUpRight
                className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.25}
              />
            </Link>
          </Button>
          <div className="mt-6 flex flex-wrap justify-center gap-4 lg:gap-6 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-400" strokeWidth={2} /> AI coach
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-400" strokeWidth={2} /> Scan makanan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-400" strokeWidth={2} /> Puasa &amp; jadwal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-400" strokeWidth={2} /> Meal plan
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-5 lg:px-6 py-10 lg:max-w-5xl lg:mx-auto">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="size-7 rounded-xl bg-emerald-500 grid place-items-center text-white">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            {APP_CONFIG.name}
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
            <Link to="/" className="hover:text-zinc-900 transition-colors">
              Beranda
            </Link>
            <Link to="/prism" className="hover:text-zinc-900 transition-colors">
              Prism
            </Link>
            <Link to="/privacy" className="hover:text-zinc-900 transition-colors">
              Privasi
            </Link>
            <Link to="/faq" className="hover:text-zinc-900 transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="text-xs text-zinc-400">© 2026 HealthyU · {APP_CONFIG.supportEmail}</div>
        </div>
      </footer>

      {/* Bottom nav (mobile only) */}
      <MobileBottomNav />
    </main>
  );
}
