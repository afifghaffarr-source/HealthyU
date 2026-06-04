import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/onboarding/steps")({
  component: OnboardingStepsPage,
});

const steps = [
  { emoji: "👋", title: "Selamat datang", body: "Mari mulai perjalanan sehatmu bersama HealthyU." },
  { emoji: "🎯", title: "Tetapkan target", body: "Berat, kalori, dan kebiasaan harian dapat disesuaikan kapan saja." },
  { emoji: "🍱", title: "Lacak makanan", body: "Scan barcode, foto, atau cari di database lokal." },
  { emoji: "💪", title: "Aktif & istirahat", body: "Latihan, puasa, tidur, dan air dipantau otomatis." },
  { emoji: "🚀", title: "Siap memulai!", body: "Buka dashboard untuk lihat ringkasan harian." },
];

function OnboardingStepsPage() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const next = () => (i < steps.length - 1 ? setI(i + 1) : navigate({ to: "/dashboard" }));
  const s = steps[i];
  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="text-7xl">{s.emoji}</div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.title}</h1>
        <p className="text-muted-foreground max-w-sm">{s.body}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, idx) => (
          <span key={idx} className={`size-2 rounded-full ${idx === i ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <button
        onClick={next}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold"
      >
        {i < steps.length - 1 ? "Lanjut" : "Mulai"}
      </button>
    </div>
  );
}