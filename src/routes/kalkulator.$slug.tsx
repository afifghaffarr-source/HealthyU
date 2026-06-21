import { createFileRoute, notFound } from "@tanstack/react-router";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { CalculatorShell } from "@/components/healthyu/calculator-shell";
import { breadcrumbSchema } from "@/components/healthyu/calculator-shell.utils";
import {
  BMIForm,
  BMRForm,
  TDEEForm,
  BodyFatForm,
  IdealWeightForm,
  WaterForm,
  MacroForm,
  HRForm,
} from "@/features/calculators/components/CalcForms";

type Slug =
  | "bmi"
  | "bmr"
  | "tdee"
  | "body-fat"
  | "ideal-weight"
  | "water-intake"
  | "macro"
  | "heart-rate-zone";

const META: Record<Slug, { title: string; description: string; h1: string; intro: string }> = {
  bmi: {
    title: "Kalkulator BMI Online Gratis · Indeks Massa Tubuh | HealthyU",
    description:
      "Hitung BMI (Indeks Massa Tubuh) Anda secara gratis. Akurat sesuai standar WHO untuk dewasa Indonesia.",
    h1: "Kalkulator BMI",
    intro: "Masukkan berat dan tinggi badan untuk mengetahui Indeks Massa Tubuh Anda.",
  },
  bmr: {
    title: "Kalkulator BMR · Basal Metabolic Rate | HealthyU",
    description: "Hitung BMR (kalori istirahat) dengan rumus Mifflin-St Jeor, paling akurat.",
    h1: "Kalkulator BMR",
    intro: "Hitung jumlah kalori yang dibakar tubuh saat istirahat total.",
  },
  tdee: {
    title: "Kalkulator TDEE · Kebutuhan Kalori Harian | HealthyU",
    description:
      "Hitung TDEE (total kalori harian) berdasarkan aktivitas. Untuk diet, bulking, atau maintenance.",
    h1: "Kalkulator TDEE",
    intro: "Total kalori yang Anda butuhkan per hari berdasarkan tingkat aktivitas.",
  },
  "body-fat": {
    title: "Kalkulator Persentase Lemak Tubuh | HealthyU",
    description: "Estimasi % lemak tubuh dengan rumus Deurenberg berbasis BMI.",
    h1: "Kalkulator Body Fat",
    intro: "Estimasi persentase lemak tubuh Anda secara cepat.",
  },
  "ideal-weight": {
    title: "Kalkulator Berat Badan Ideal | HealthyU",
    description: "Hitung berat badan ideal sesuai tinggi & jenis kelamin (rumus Devine).",
    h1: "Berat Badan Ideal",
    intro: "Berapa berat ideal Anda berdasarkan tinggi dan jenis kelamin.",
  },
  "water-intake": {
    title: "Kalkulator Kebutuhan Air Harian | HealthyU",
    description:
      "Hitung berapa liter air yang harus diminum per hari sesuai berat badan & aktivitas.",
    h1: "Kebutuhan Air Harian",
    intro: "Berapa banyak air yang harus Anda minum tiap hari.",
  },
  macro: {
    title: "Kalkulator Makro · Protein, Karbo, Lemak | HealthyU",
    description: "Hitung kebutuhan makro harian untuk diet, maintenance, atau bulking.",
    h1: "Kalkulator Makronutrien",
    intro: "Pecah kalori harian Anda menjadi protein, karbohidrat, dan lemak.",
  },
  "heart-rate-zone": {
    title: "Kalkulator Zona Detak Jantung untuk Olahraga | HealthyU",
    description: "Hitung 5 zona detak jantung untuk pemulihan, bakar lemak, hingga maksimal.",
    h1: "Zona Detak Jantung",
    intro: "Temukan zona detak jantung optimal untuk olahraga Anda.",
  },
};

const SLUGS = Object.keys(META) as Slug[];

export const Route = createFileRoute("/kalkulator/$slug")({
  beforeLoad: ({ params }) => {
    if (!SLUGS.includes(params.slug as Slug)) throw notFound();
  },
  head: ({ params }) => {
    const slug = params.slug as Slug;
    const meta = META[slug];
    if (!meta) return {};
    const url = canonical(`/kalkulator/${slug}`);
    return {
      meta: [
        { title: meta.title },
        { name: "description", content: meta.description },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangAlternates(`/kalkulator/${slug}`)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbSchema([
              { name: "Beranda", to: "/" },
              { name: "Kalkulator", to: "/kalkulator" },
              { name: meta.h1, to: `/kalkulator/${slug}` },
            ]),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: meta.h1,
            description: meta.description,
            step: [
              { "@type": "HowToStep", name: "Masukkan data", text: meta.intro },
              {
                "@type": "HowToStep",
                name: "Lihat hasil",
                text: "Hasil otomatis muncul tanpa perlu submit.",
              },
            ],
          }),
        },
      ],
    };
  },
  component: CalcPage,
  notFoundComponent: () => <div className="p-8">Kalkulator tidak ditemukan.</div>,
});

function CalcPage() {
  const { slug } = Route.useParams();
  const meta = META[slug as Slug];
  const breadcrumbs = [
    { name: "Beranda", to: "/" },
    { name: "Kalkulator", to: "/kalkulator" },
    { name: meta.h1, to: `/kalkulator/${slug}` },
  ];
  return (
    <CalculatorShell title={meta.h1} description={meta.intro} breadcrumbs={breadcrumbs}>
      <CalcSwitcher slug={slug as Slug} />
    </CalculatorShell>
  );
}

function CalcSwitcher({ slug }: { slug: Slug }) {
  switch (slug) {
    case "bmi":
      return <BMIForm />;
    case "bmr":
      return <BMRForm />;
    case "tdee":
      return <TDEEForm />;
    case "body-fat":
      return <BodyFatForm />;
    case "ideal-weight":
      return <IdealWeightForm />;
    case "water-intake":
      return <WaterForm />;
    case "macro":
      return <MacroForm />;
    case "heart-rate-zone":
      return <HRForm />;
  }
}
