import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { celebrate } from "@/lib/confetti";

export const Route = createFileRoute("/_authenticated/onboarding/steps")({
  component: OnboardingStepsPage,
});

const steps = [
  { emoji: "👋", title: "Selamat datang", body: "Mari mulai perjalanan sehatmu bersama HealthyU.", grad: "from-primary/25 to-accent/15" },
  { emoji: "🎯", title: "Tetapkan target", body: "Berat, kalori, dan kebiasaan harian dapat disesuaikan kapan saja.", grad: "from-accent/25 to-primary/15" },
  { emoji: "🍱", title: "Lacak makanan", body: "Scan barcode, foto, atau cari di database lokal.", grad: "from-secondary/30 to-primary/15" },
  { emoji: "💪", title: "Aktif & istirahat", body: "Latihan, puasa, tidur, dan air dipantau otomatis.", grad: "from-primary/20 to-secondary/25" },
  { emoji: "🚀", title: "Siap memulai!", body: "Buka dashboard untuk lihat ringkasan harian.", grad: "from-accent/25 to-secondary/25" },
];

function OnboardingStepsPage() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const touchX = useRef<number | null>(null);
  const finish = () => {
    celebrate({ intense: true });
    setTimeout(() => navigate({ to: "/dashboard" }), 400);
  };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const prev = () => i > 0 && setI(i - 1);
  const s = steps[i];
  return (
    <div
      className={`min-h-dvh flex flex-col p-6 bg-gradient-to-br ${s.grad} transition-colors duration-500`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -50) next();
        else if (dx > 50) prev();
        touchX.current = null;
      }}
    >
      <div className="flex justify-between items-center">
        <button
          onClick={prev}
          disabled={i === 0}
          className="size-9 grid place-items-center rounded-full bg-card/70 backdrop-blur disabled:opacity-0 transition"
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </button>
        {i < steps.length - 1 && (
          <button onClick={finish} className="text-xs font-semibold text-muted-foreground px-3 py-1.5 rounded-full hover:bg-card/50">
            Lewati
          </button>
        )}
      </div>
      <div key={i} className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-fade-up">
        <div className="text-8xl drop-shadow-sm">{s.emoji}</div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.title}</h1>
        <p className="text-muted-foreground max-w-sm">{s.body}</p>
      </div>
      <div className="flex justify-center gap-1.5 mb-6">
        {steps.map((_, idx) => (
          <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
        ))}
      </div>
      <button
        onClick={next}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold shadow-lg active:scale-[0.98] transition"
      >
        {i < steps.length - 1 ? "Lanjut" : "Mulai"}
      </button>
    </div>
  );
}