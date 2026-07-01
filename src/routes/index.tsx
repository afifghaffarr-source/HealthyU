import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { APP_CONFIG } from "@/config/app";
import { supabase } from "@/integrations/supabase/client";
import { BmrQuiz } from "@/features/landing/components/BmrQuiz";
import { canonical, hreflangAlternates } from "@/lib/seo";
import {
  TrustMarquee,
  StatsStrip,
  FeaturesBento,
} from "@/features/landing/components/LandingSections";
import {
  ConfettiBurst,
  LandingBackdrop,
  LandingNav,
  FinalCtaSection,
  LandingFooter,
  StickyCta,
} from "@/features/landing/components/LandingChrome";
import { MobileNav } from "@/features/landing/components/MobileNav";
import { LandingHero } from "@/features/landing/components/LandingHero";
import { useExperimentVariant, useExperimentConversion } from "@/hooks/use-experiments";

// PERF (Fase 5 sub-PR 2): lazy-load below-fold landing sections so the
// home page initial JS payload is ~30-40% smaller. Each section is a
// separate route-loadable chunk; React.Suspense renders a thin skeleton
// placeholder during the brief load window. Trade-off: first-time scroll
// to a section may show skeleton for ~50-100ms. Win: TTI improvement
// (lower FCP/LCP on first contentful paint, lower main thread work).
const HowItWorks = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.HowItWorks,
  })),
);
const Testimonials = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.Testimonials,
  })),
);
const FaqSection = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.FaqSection,
  })),
);
const ComparisonTable = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.ComparisonTable,
  })),
);
const ForWhom = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.ForWhom,
  })),
);
const BeforeAfterSection = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.BeforeAfterSection,
  })),
);
const PopularRecipes = lazy(() =>
  import("@/features/landing/components/LandingSections").then((m) => ({
    default: m.PopularRecipes,
  })),
);
// ponytail: Removed FeaturedIn section — fake media logos ("Kompas", "Detik", etc.)
// without actual press coverage hurts credibility. Add back when real PR exists.
const PricingSection = lazy(() =>
  import("@/features/landing/components/LandingChrome").then((m) => ({
    default: m.PricingSection,
  })),
);
const NewsletterSection = lazy(() =>
  import("@/features/landing/components/NewsletterSection").then((m) => ({
    default: m.NewsletterSection,
  })),
);
const FloatingChat = lazy(() =>
  import("@/features/landing/components/FloatingChat").then((m) => ({
    default: m.FloatingChat,
  })),
);
const LazyLandingFooter = lazy(() =>
  import("@/features/landing/components/LandingChrome").then((m) => ({
    default: m.LandingFooter,
  })),
);

// Skeleton placeholder for lazy sections (matches body bg so no CLS jump).
const SectionSkeleton = () => (
  <div aria-hidden="true" className="max-w-6xl mx-auto px-5 md:px-8 py-16 min-h-[40vh]" />
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HealthyU · AI Nutrition Coach untuk Indonesia" },
      {
        name: "description",
        content:
          "Diet personal, puasa terencana, jadwal sholat, dan AI coach HealthyU AI Coach. Database makanan Indonesia lengkap. Gratis.",
      },
      {
        name: "keywords",
        content:
          "diet, puasa, intermittent fasting, nutrisi, AI coach, makanan Indonesia, jadwal sholat, kalori",
      },
      { property: "og:title", content: "HealthyU · AI Nutrition Coach untuk Indonesia" },
      {
        property: "og:description",
        content:
          "Diet personal, puasa terencana, jadwal sholat, dan AI coach HealthyU AI Coach. Gratis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HealthyU · AI Nutrition Coach untuk Indonesia" },
      {
        name: "twitter:description",
        content: "Diet personal, puasa, jadwal sholat, dan AI coach.",
      },
    ],
    links: [{ rel: "canonical", href: `${APP_CONFIG.siteUrl}/` }, ...hreflangAlternates("/")],
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

  // A/B test: override the default landing hero CTA label when the
  // "landing.heroCta" experiment returns a non-empty payload.ctaLabel.
  // The seeded experiment is a 50/50 split between "Mulai gratis sekarang"
  // (variant_a) and "Coba sekarang" (variant_b) — but variant_a intentionally
  // equals the default so this only visibly changes for ~50% of visitors
  // (those assigned variant_b). For anonymous users, the RPC returns
  // variant_a, so the label remains the existing default "Mulai gratis...".
  // Sprint 58-I: also fires an impression on mount (auto via hook) and
  // a conversion on CTA click (via useExperimentConversion).
  const { variant: heroCtaVariant, payload: heroCtaPayload } =
    useExperimentVariant("landing.heroCta");
  const trackHeroCta = useExperimentConversion("landing.heroCta", heroCtaVariant, "hero_cta_click");
  const defaultCtaPrimaryLabel = hasSession ? "Buka Dashboard" : "Mulai gratis sekarang";
  const ctaPrimaryLabel =
    typeof heroCtaPayload.ctaLabel === "string" && heroCtaPayload.ctaLabel.length > 0
      ? heroCtaPayload.ctaLabel
      : defaultCtaPrimaryLabel;

  const fireConfetti = () => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hu_confetti")) return;
    sessionStorage.setItem("hu_confetti", "1");
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1600);
  };

  const onHeroCtaClick = () => {
    trackHeroCta();
    fireConfetti();
  };

  return (
    <main
      role="main"
      className="min-h-dvh bg-background text-foreground relative overflow-x-clip pb-24 md:pb-0"
    >
      {confetti && <ConfettiBurst />}
      <LandingBackdrop />

      <LandingNav hasSession={hasSession} ctaPrimary={ctaPrimary} />
      <MobileNav />

      <LandingHero
        ctaPrimary={ctaPrimary}
        ctaPrimaryLabel={ctaPrimaryLabel}
        onCtaClick={onHeroCtaClick}
      />

      <TrustMarquee />

      <StatsStrip />

      <FeaturesBento />

      <Suspense fallback={<SectionSkeleton />}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <Testimonials />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FaqSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ComparisonTable />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ForWhom />
      </Suspense>

      {/* BMR Quiz */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <BmrQuiz />
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <PopularRecipes ctaHref={ctaPrimary} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <BeforeAfterSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <PricingSection ctaPrimary={ctaPrimary} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <NewsletterSection />
      </Suspense>

      <FinalCtaSection
        ctaPrimary={ctaPrimary}
        ctaPrimaryLabel={ctaPrimaryLabel}
        onCtaClick={onHeroCtaClick}
      />

      <Suspense fallback={<SectionSkeleton />}>
        <LazyLandingFooter />
      </Suspense>

      <StickyCta
        show={showStickyCta}
        hasSession={hasSession}
        ctaPrimary={ctaPrimary}
        onCtaClick={onHeroCtaClick}
      />

      <Suspense fallback={null}>
        <FloatingChat />
      </Suspense>
    </main>
  );
}
