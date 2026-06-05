import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { LandingHero } from "@/features/landing/components/LandingHero";

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

      <LandingHero
        ctaPrimary={ctaPrimary}
        ctaPrimaryLabel={ctaPrimaryLabel}
        onCtaClick={fireConfetti}
      />

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
