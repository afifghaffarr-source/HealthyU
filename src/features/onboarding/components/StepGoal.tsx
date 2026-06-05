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
        <p className="text-muted-foreground text-sm">Kami sesuaikan target kalori harian.</p>
      </div>
      <div className="space-y-2">
        {(
          [
            ["lose", "Turun berat", "Defisit ~400 kkal"],
            ["maintain", "Pertahankan", "Sesuai TDEE"],
            ["gain", "Naik berat / massa", "Surplus ~300 kkal"],
          ] as const
        ).map(([k, title, sub]) => (
          <button
            key={k}
            onClick={() => setGoal(k)}
            className={`w-full text-left p-4 rounded-2xl transition ${goal === k ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
          >
            <div className="text-sm font-semibold">{title}</div>
            <div
              className={`text-xs mt-0.5 ${goal === k ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {sub}
            </div>
          </button>
        ))}
      </div>
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