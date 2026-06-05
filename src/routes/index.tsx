import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Star,
  Check,
  Shield,
  ArrowRight,
  Flame,
  Zap,
  Crown,
} from "lucide-react";
import { BmrQuiz } from "@/features/landing/components/BmrQuiz";
import { FloatingChat } from "@/features/landing/components/FloatingChat";
import {
  TrustMarquee,
  StatsStrip,
  FeaturesBento,
  HowItWorks,
  Testimonials,
  FaqSection,
  ComparisonTable,
  ForWhom,
  BeforeAfterSection,
  FeaturedIn,
  HeroDemoCard,
  PopularRecipes,
} from "@/features/landing/components/LandingSections";
import { NewsletterSection } from "@/features/landing/components/NewsletterSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      {
        name: "description",
        content:
          "Diet personal, puasa terencana, jadwal sholat, dan AI coach Dr. Healthy. Database makanan Indonesia lengkap. Gratis.",
      },
      {
        name: "keywords",
        content:
          "diet, puasa, intermittent fasting, nutrisi, AI coach, makanan Indonesia, jadwal sholat, kalori",
      },
      { property: "og:title", content: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      {
        property: "og:description",
        content: "Diet personal, puasa terencana, jadwal sholat, dan AI coach Dr. Healthy. Gratis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HealthyU — AI Nutrition Coach untuk Indonesia" },
      {
        name: "twitter:description",
        content: "Diet personal, puasa, jadwal sholat, dan AI coach.",
      },
    ],
    links: [{ rel: "canonical", href: "https://healthyu.id/" }],
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
    <main className="min-h-dvh bg-background text-foreground relative overflow-x-clip">
      {confetti && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-0 size-2 rounded-sm animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                background: ["#16a34a", "#0ea5e9", "#f59e0b", "#ec4899", "#a855f7"][i % 5],
                animationDelay: `${Math.random() * 0.4}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}
      {/* Animated gradient mesh background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[480px] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div
          className="absolute top-1/3 -right-40 size-[520px] rounded-full bg-accent/20 blur-3xl animate-blob"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-primary-glow/25 blur-3xl animate-blob"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="font-bold tracking-tight text-lg flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="relative size-8 rounded-xl grid place-items-center text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30">
              H
              <span className="absolute -inset-0.5 rounded-xl bg-primary/40 blur-md -z-10" />
            </span>
            HealthyU
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#fitur" className="hover:text-foreground">
              Fitur
            </a>
            <a href="#cara" className="hover:text-foreground">
              Cara kerja
            </a>
            <a href="#testimoni" className="hover:text-foreground">
              Testimoni
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
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
          <h1
            className="text-4xl md:text-6xl font-bold tracking-tight text-balance leading-[1.05]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hidup sehat,{" "}
            <span className="relative inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary-glow animate-aurora">
                ditemani AI
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="10"
                viewBox="0 0 200 10"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 7 Q 50 1 100 5 T 198 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-primary/60"
                />
              </svg>
            </span>
            <br />
            yang ngerti Indonesia.
          </h1>
          <p className="text-muted-foreground text-lg text-balance max-w-md">
            Scan piring, atur puasa, lihat jadwal sholat, dan tanya{" "}
            <span className="font-semibold text-foreground">Dr. Healthy</span> kapan saja — semua
            dalam satu app yang ringan & gratis.
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
                <span
                  key={c}
                  className="size-7 rounded-full border-2 border-background"
                  style={{ background: c }}
                />
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
          <div
            className="absolute -bottom-4 -right-2 z-10 hidden sm:flex items-center gap-2 glass border border-white/15 rounded-2xl px-3 py-2 shadow-lg animate-float"
            style={{ animationDelay: "-3s" }}
          >
            <Zap className="size-4 text-primary" />
            <div className="text-xs">
              <p className="font-bold leading-none">+120 poin</p>
              <p className="text-muted-foreground">Goal harian</p>
            </div>
          </div>

          <HeroDemoCard />
        </div>
      </section>


      <TrustMarquee />

      <StatsStrip />

      <FeaturesBento />

      <HowItWorks />

      <Testimonials />

      <FaqSection />

      <ComparisonTable />

      <ForWhom />

      {/* BMR Quiz */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <BmrQuiz />
      </section>

      <PopularRecipes ctaHref={ctaPrimary} />

      <BeforeAfterSection />

      {/* Pricing teaser */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-3xl p-7 border border-primary/30">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
              Gratis
            </span>
            <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>
              Rp 0 <span className="text-sm font-normal text-muted-foreground">/ selamanya</span>
            </h3>
            <ul className="text-sm space-y-2 mt-4 text-muted-foreground">
              {[
                "Scan makanan AI",
                "Meal plan personal",
                "Puasa & jadwal sholat",
                "Dr. Healthy chatbot",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {x}
                </li>
              ))}
            </ul>
            <Link
              to={ctaPrimary}
              className="mt-5 block text-center bg-primary text-primary-foreground font-semibold py-3 rounded-xl"
            >
              Mulai gratis
            </Link>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-7 shadow-xl">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
              <Crown className="size-3" /> Premium (segera)
            </span>
            <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>
              Rp 29rb <span className="text-sm font-normal opacity-80">/ bulan</span>
            </h3>
            <ul className="text-sm space-y-2 mt-4 opacity-95">
              {[
                "Konsultasi nutritionist real",
                "Resep premium tanpa batas",
                "Export laporan PDF",
                "Sinkron Apple/Google Fit",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4" />
                  {x}
                </li>
              ))}
            </ul>
            <button className="mt-5 w-full text-center bg-white text-primary font-semibold py-3 rounded-xl">
              Notify saya
            </button>
          </div>
        </div>
      </section>

      <NewsletterSection />

      <FeaturedIn />

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-10 md:p-14 space-y-5 shadow-2xl shadow-primary/30">
          <div
            aria-hidden
            className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/10 blur-3xl"
          />
          <h2
            className="relative text-3xl md:text-5xl font-bold tracking-tight text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mulai perjalanan sehatmu hari ini
          </h2>
          <p className="relative text-primary-foreground/85 text-balance">
            Gratis selamanya. Tanpa kartu kredit. Hasil terlihat dalam 7 hari pertama.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to={ctaPrimary}
              onClick={fireConfetti}
              className="group inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold py-4 px-6 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-transform"
            >
              {ctaPrimaryLabel}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <ul className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/80 pt-2">
            <li className="flex items-center gap-1">
              <Check className="size-3.5" /> Gratis selamanya
            </li>
            <li className="flex items-center gap-1">
              <Check className="size-3.5" /> Database makanan Indonesia
            </li>
            <li className="flex items-center gap-1">
              <Check className="size-3.5" /> AI coach 24/7
            </li>
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
      <div
        className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-40 transition-all ${showStickyCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}
      >
        <div className="glass border border-white/20 shadow-2xl rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
          <span className="text-xs font-semibold hidden sm:inline">
            Siap memulai? Gratis selamanya.
          </span>
          <Link
            to={ctaPrimary}
            onClick={fireConfetti}
            className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5"
          >
            {hasSession ? "Dashboard" : "Mulai"} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <FloatingChat />
    </main>
  );
}
