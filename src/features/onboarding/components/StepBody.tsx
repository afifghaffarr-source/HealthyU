import { NumberField, type OnboardingForm, primaryBtn, secondaryBtn } from "./onboardingShared";

export function StepBody({
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
        <h1 className="text-2xl font-bold mb-1">Tubuhmu sekarang</h1>
        <p className="text-muted-foreground text-sm">
          Untuk menghitung kebutuhan kalori harian.
        </p>
      </div>
      <NumberField
        label="Tinggi (cm)"
        value={form.height_cm}
        onChange={(v) => setForm({ ...form, height_cm: v })}
        min={120}
        max={220}
      />
      <NumberField
        label="Berat saat ini (kg)"
        value={form.weight_kg}
        onChange={(v) => setForm({ ...form, weight_kg: v })}
        min={30}
        max={200}
      />
      <NumberField
        label="Target berat (kg)"
        value={form.target_weight_kg}
        onChange={(v) => setForm({ ...form, target_weight_kg: v })}
        min={30}
        max={200}
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