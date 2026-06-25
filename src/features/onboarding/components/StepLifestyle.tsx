import { DIETARY, type OnboardingForm, primaryBtn, secondaryBtn } from "./onboardingShared";

export function StepLifestyle({
  form,
  setForm,
  onBack,
  onNext,
}: {
  form: OnboardingForm;
  setForm: (f: OnboardingForm) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Gaya hidup</h1>
        <p className="text-muted-foreground text-sm">
          Seberapa aktif kamu setiap hari? Kami pakai ini untuk rekomendasi yang lebih pas.
        </p>
      </div>
      <div className="space-y-2">
        {(
          [
            ["sedentary", "Tidak aktif (kerja meja, jarang olahraga)"],
            ["light", "Ringan (olahraga 1-3x/minggu)"],
            ["moderate", "Sedang (olahraga 3-5x/minggu)"],
            ["active", "Aktif (olahraga 6-7x/minggu)"],
            ["very_active", "Sangat aktif (atlet, kerja fisik)"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setForm({ ...form, activity_level: k })}
            className={`w-full text-left p-4 rounded-2xl transition ${form.activity_level === k ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
          >
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Preferensi diet</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setForm({ ...form, dietary_preference: k })}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                form.dietary_preference === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-card outline-1 outline-black/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <input
        placeholder="Kota (untuk jadwal sholat)"
        value={form.city}
        onChange={(e) => setForm({ ...form, city: e.target.value })}
        className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5"
      />
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
