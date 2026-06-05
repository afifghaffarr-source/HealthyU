import { Heart, Scale, Battery, Sparkles } from "lucide-react";
import { type Goal, primaryBtn, secondaryBtn } from "./onboardingShared";

export function StepGoal({
  goal,
  setGoal,
  onBack,
  onNext,
}: {
  goal: Goal;
  setGoal: (g: Goal) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Tujuanmu?</h1>
        <p className="text-muted-foreground text-sm">
          Kami sesuaikan target kalori harian. Bisa diubah kapan saja di Profil.
        </p>
      </div>
      <div className="space-y-2">
        {(
          [
            ["lose", "Berat lebih ideal", "Turun pelan-pelan, defisit ~400 kkal", Scale],
            ["maintain", "Lebih sehat", "Pertahankan berat & bangun kebiasaan baik", Heart],
            ["gain", "Lebih bertenaga", "Tambah energi & massa, surplus ~300 kkal", Battery],
          ] as const
        ).map(([k, title, sub, Icon]) => (
          <button
            key={k}
            onClick={() => setGoal(k)}
            className={`w-full text-left p-4 rounded-2xl transition flex items-start gap-3 ${goal === k ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
            aria-pressed={goal === k}
          >
            <span
              className={`size-10 shrink-0 rounded-xl grid place-items-center ${goal === k ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{title}</span>
              <span
                className={`block text-xs mt-0.5 ${goal === k ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {sub}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1.5 px-1">
        <Sparkles className="size-3.5 mt-0.5 text-primary shrink-0" aria-hidden />
        <span>Kenapa kami tanya ini? Untuk menyesuaikan target kalori & rekomendasi yang lebih relevan.</span>
      </p>
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={onBack} className={secondaryBtn}>
          Kembali
        </button>
        <button onClick={onNext} className={primaryBtn}>
          Lanjut
        </button>
      </div>
    </section>
  );
}