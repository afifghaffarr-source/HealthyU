import { Heart, Scale, Battery, Sparkles, Flame } from "lucide-react";
import {
  type Goal,
  type Pace,
  paceDelta,
  paceKgPerWeek,
  primaryBtn,
  secondaryBtn,
} from "./onboardingShared";

export function StepGoal({
  goal,
  setGoal,
  pace,
  setPace,
  tdee,
  onBack,
  onNext,
}: {
  goal: Goal;
  setGoal: (g: Goal) => void;
  pace: Pace;
  setPace: (p: Pace) => void;
  tdee: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const delta = paceDelta(goal, pace);
  const target = Math.max(1200, tdee + delta);
  const kgPerWeek = paceKgPerWeek(delta);
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

      {goal !== "maintain" && (
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-semibold">Pilih ritme yang nyaman</p>
            <p className="text-[11px] text-muted-foreground">
              Pelan tapi konsisten lebih awet daripada cepat tapi tersiksa.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["gentle", "Santai", "Paling mudah"],
                ["steady", "Stabil", "Direkomendasikan"],
                ["ambitious", "Ambisius", "Butuh disiplin"],
              ] as const
            ).map(([k, label, hint]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPace(k)}
                aria-pressed={pace === k}
                className={`p-2.5 rounded-2xl text-center transition min-h-11 ${
                  pace === k
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                <span className="block text-[13px] font-semibold">{label}</span>
                <span
                  className={`block text-[10px] mt-0.5 ${
                    pace === k ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card outline-1 outline-black/10 dark:outline-white/10 rounded-2xl p-4 flex items-center gap-3">
        <span className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
          <Flame className="size-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Estimasi target harian
          </p>
          <p className="text-lg font-bold tabular-nums">
            {target} kkal
            {goal !== "maintain" && (
              <span className="text-xs text-muted-foreground font-medium">
                {" "}
                ({delta > 0 ? "+" : ""}
                {delta} kkal)
              </span>
            )}
          </p>
          {goal !== "maintain" && kgPerWeek > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Perkiraan {goal === "lose" ? "turun" : "naik"} ~{kgPerWeek} kg/minggu. Tubuh setiap
              orang berbeda — angka ini panduan, bukan jaminan.
            </p>
          )}
        </div>
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