import { Check } from "lucide-react";
import type { ActivityLevel } from "@/lib/health";

export type Goal = "lose" | "maintain" | "gain";

export const HEALTH_CONDITIONS = [
  "Diabetes",
  "Hipertensi",
  "Kolesterol tinggi",
  "Asam lambung / GERD",
  "Asam urat",
  "PCOS",
  "Tiroid",
  "Penyakit jantung",
] as const;

export const ALLERGIES = [
  "Kacang",
  "Susu / laktosa",
  "Telur",
  "Gluten",
  "Seafood",
  "Kedelai",
  "Ikan",
  "Wijen",
] as const;

export const DIETARY = [
  ["balanced", "Seimbang"],
  ["high_protein", "Tinggi protein"],
  ["low_carb", "Rendah karbo"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["halal", "Halal tradisional"],
] as const;

export type OnboardingForm = {
  full_name: string;
  gender: "male" | "female";
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
  dietary_preference: string;
  city: string;
  allergies: string[];
  health_conditions: string[];
};

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5 tabular-nums"
      />
    </label>
  );
}

const primaryBtn =
  "bg-primary text-primary-foreground font-semibold py-4 rounded-2xl";
const secondaryBtn =
  "bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl";

export function StepIdentity({
  form,
  setForm,
  onNext,
}: {
  form: OnboardingForm;
  setForm: (f: OnboardingForm) => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Halo! Siapa namamu?</h1>
        <p className="text-muted-foreground text-sm">Kami ingin mengenalmu lebih baik.</p>
      </div>
      <input
        placeholder="Nama lengkap"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setForm({ ...form, gender: "male" })}
          className={`py-4 rounded-2xl font-semibold transition ${form.gender === "male" ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
        >
          Pria
        </button>
        <button
          onClick={() => setForm({ ...form, gender: "female" })}
          className={`py-4 rounded-2xl font-semibold transition ${form.gender === "female" ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
        >
          Wanita
        </button>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Tanggal lahir</span>
        <input
          type="date"
          value={form.birth_date}
          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          className="mt-1.5 w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5"
        />
      </label>
      <button onClick={onNext} className={`w-full ${primaryBtn}`}>
        Lanjut
      </button>
    </section>
  );
}

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
        <p className="text-muted-foreground text-sm">Seberapa aktif kamu setiap hari?</p>
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

export function StepHealth({
  form,
  toggleIn,
  onBack,
  onFinish,
  pending,
}: {
  form: OnboardingForm;
  toggleIn: (key: "allergies" | "health_conditions", val: string) => void;
  onBack: () => void;
  onFinish: () => void;
  pending: boolean;
}) {
  return (
    <section className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold mb-1">Kondisi & alergi</h1>
        <p className="text-muted-foreground text-sm">
          AI akan menyesuaikan rekomendasi makanan.
        </p>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Kondisi kesehatan</p>
        <div className="flex flex-wrap gap-2">
          {HEALTH_CONDITIONS.map((c) => {
            const active = form.health_conditions.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleIn("health_conditions", c)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                {active ? <Check className="size-3" /> : null}
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Alergi makanan</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((a) => {
            const active = form.allergies.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleIn("allergies", a)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                {active ? <Check className="size-3" /> : null}
                {a}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={onBack} className={secondaryBtn}>
          Kembali
        </button>
        <button
          onClick={onFinish}
          disabled={pending}
          className={`${primaryBtn} disabled:opacity-60`}
        >
          {pending ? "Menyimpan..." : "Mulai"}
        </button>
      </div>
    </section>
  );
}