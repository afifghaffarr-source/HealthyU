import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Star, Shield, ArrowRight, Flame, Zap } from "lucide-react";
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
import {
  ConfettiBurst,
  LandingBackdrop,
  LandingNav,
  PricingSection,
  FinalCtaSection,
  LandingFooter,
  StickyCta,
} from "@/features/landing/components/LandingChrome";

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
      {confetti && <ConfettiBurst />}
      <LandingBackdrop />

      <LandingNav hasSession={hasSession} ctaPrimary={ctaPrimary} />

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

      <PricingSection ctaPrimary={ctaPrimary} />

      <NewsletterSection />

      <FeaturedIn />

      <FinalCtaSection
        ctaPrimary={ctaPrimary}
        ctaPrimaryLabel={ctaPrimaryLabel}
        onCtaClick={fireConfetti}
      />

      <LandingFooter />

      <StickyCta
        show={showStickyCta}
        hasSession={hasSession}
        ctaPrimary={ctaPrimary}
        onCtaClick={fireConfetti}
      />

      <FloatingChat />
    </main>
  );
}
