import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { calcAge, calcBMR, calcTDEE, type ActivityLevel } from "@/lib/health";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Goal = "lose" | "maintain" | "gain";

const HEALTH_CONDITIONS = [
  "Diabetes",
  "Hipertensi",
  "Kolesterol tinggi",
  "Asam lambung / GERD",
  "Asam urat",
  "PCOS",
  "Tiroid",
  "Penyakit jantung",
] as const;

const ALLERGIES = [
  "Kacang",
  "Susu / laktosa",
  "Telur",
  "Gluten",
  "Seafood",
  "Kedelai",
  "Ikan",
  "Wijen",
] as const;

const DIETARY = [
  ["balanced", "Seimbang"],
  ["high_protein", "Tinggi protein"],
  ["low_carb", "Rendah karbo"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["halal", "Halal tradisional"],
] as const;

const TOTAL_STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<Goal>("lose");
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    gender: "male" as "male" | "female",
    birth_date: "1995-01-01",
    height_cm: 170,
    weight_kg: 70,
    target_weight_kg: 65,
    activity_level: "moderate" as ActivityLevel,
    dietary_preference: "balanced",
    city: "Jakarta",
    allergies: [] as string[],
    health_conditions: [] as string[],
  });

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      full_name: profile.full_name ?? current.full_name,
      gender: profile.gender === "female" ? "female" : current.gender,
      birth_date: profile.birth_date ?? current.birth_date,
      height_cm: profile.height_cm ? Number(profile.height_cm) : current.height_cm,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : current.weight_kg,
      target_weight_kg: profile.target_weight_kg
        ? Number(profile.target_weight_kg)
        : current.target_weight_kg,
      activity_level: (profile.activity_level as ActivityLevel | null) ?? current.activity_level,
      dietary_preference: profile.dietary_preference ?? current.dietary_preference,
      city: profile.city ?? current.city,
      allergies: Array.isArray(profile.allergies) ? profile.allergies : current.allergies,
      health_conditions: Array.isArray(profile.health_conditions)
        ? profile.health_conditions
        : current.health_conditions,
    }));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil tersimpan!");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal simpan"),
  });

  const finish = () => {
    const bmr = calcBMR({
      weightKg: form.weight_kg,
      heightCm: form.height_cm,
      age: calcAge(form.birth_date),
      gender: form.gender,
    });
    const tdee = calcTDEE(bmr, form.activity_level);
    const target =
      goal === "lose" ? Math.max(1200, tdee - 400) : goal === "gain" ? tdee + 300 : tdee;
    mutation.mutate({ ...form, daily_calorie_target: target, onboarded: true });
  };

  const toggleIn = (key: "allergies" | "health_conditions", val: string) =>
    setForm((f) => {
      const has = f[key].includes(val);
      return { ...f, [key]: has ? f[key].filter((x) => x !== val) : [...f[key], val] };
    });

  return (
    <main className="min-h-screen bg-background px-6 py-10 max-w-md mx-auto">
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, idx) => idx + 1).map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-mint"}`}
          />
        ))}
      </div>

      {step === 1 && (
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
          <button
            onClick={() => setStep(2)}
            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl"
          >
            Lanjut
          </button>
        </section>
      )}

      {step === 2 && (
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
            <button
              onClick={() => setStep(1)}
              className="bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl"
            >
              Lanjut
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
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
            <button
              onClick={() => setStep(2)}
              className="bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl"
            >
              Lanjut
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
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
            <button
              onClick={() => setStep(3)}
              className="bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(5)}
              className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl"
            >
              Lanjut
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
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
            <button
              onClick={() => setStep(4)}
              className="bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl"
            >
              Kembali
            </button>
            <button
              onClick={finish}
              disabled={mutation.isPending}
              className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl disabled:opacity-60"
            >
              {mutation.isPending ? "Menyimpan..." : "Mulai"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function NumberField({
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
