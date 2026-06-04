import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { CALCS, KalkulatorHub } from "./kalkulator";

export const Route = createFileRoute("/kalkulator/")({
  head: () => ({
    meta: [
      { title: "8 Kalkulator Kesehatan Gratis — HealthyU" },
      {
        name: "description",
        content:
          "Kalkulator BMI, BMR, TDEE, body fat, berat ideal, kebutuhan air, makro, dan zona detak jantung. Gratis, akurat, dalam Bahasa Indonesia.",
      },
      { property: "og:title", content: "8 Kalkulator Kesehatan Gratis — HealthyU" },
      {
        property: "og:description",
        content: "Lengkap: BMI, BMR, TDEE, body fat, makro, dan lainnya.",
      },
      { property: "og:url", content: canonical("/kalkulator") },
    ],
    links: [{ rel: "canonical", href: canonical("/kalkulator") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Kalkulator Kesehatan HealthyU",
          itemListElement: CALCS.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            url: canonical(`/kalkulator/${c.slug}`),
          })),
        }),
      },
    ],
  }),
  component: KalkulatorHub,
});