import { createFileRoute, Outlet } from "@tanstack/react-router";

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
  component: () => <Outlet />,
});
