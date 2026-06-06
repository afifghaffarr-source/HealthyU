import {
  NumberField,
  WhyAskDisclosure,
  type OnboardingForm,
  primaryBtn,
  secondaryBtn,
} from "./onboardingShared";

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
          Kami pakai data ini untuk menghitung kebutuhan kalori harian. Bisa diubah kapan saja.
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
      <p className="text-[11px] text-muted-foreground px-1">
        Tidak ada target “sempurna”. Fokus ke konsistensi, bukan angka.
      </p>
      <WhyAskDisclosure>
        Tinggi & berat dipakai untuk menghitung kebutuhan kalori harianmu (BMR & TDEE). Data
        tersimpan privat di akunmu dan bisa diubah kapan saja.
      </WhyAskDisclosure>
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