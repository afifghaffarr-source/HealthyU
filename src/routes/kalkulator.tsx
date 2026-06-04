import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";

export const CALCS = [
  { slug: "bmi", name: "Kalkulator BMI", desc: "Hitung Indeks Massa Tubuh Anda" },
  { slug: "bmr", name: "Kalkulator BMR", desc: "Basal Metabolic Rate harian" },
  { slug: "tdee", name: "Kalkulator TDEE", desc: "Total kalori harian yang dibakar" },
  { slug: "body-fat", name: "Kalkulator Body Fat", desc: "Estimasi persentase lemak tubuh" },
  { slug: "ideal-weight", name: "Berat Badan Ideal", desc: "Berdasarkan tinggi & gender" },
  { slug: "water-intake", name: "Kebutuhan Air", desc: "Target air harian Anda" },
  { slug: "macro", name: "Kalkulator Makro", desc: "Protein, karbo, lemak harian" },
  { slug: "heart-rate-zone", name: "Zona Detak Jantung", desc: "Untuk olahraga & kardio" },
] as const;

export const Route = createFileRoute("/kalkulator")({
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

function KalkulatorHub() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          8 Kalkulator Kesehatan Gratis
        </h1>
        <p className="mt-3 text-muted-foreground">
          Hitung BMI, kalori harian, lemak tubuh, dan lainnya — akurat, cepat, tanpa daftar.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CALCS.map((c) => (
          <Link
            key={c.slug}
            to="/kalkulator/$slug"
            params={{ slug: c.slug }}
            className="rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <h2 className="font-semibold text-foreground">{c.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}