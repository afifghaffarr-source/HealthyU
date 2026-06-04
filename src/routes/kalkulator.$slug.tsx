import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { canonical } from "@/lib/seo";
import {
  CalculatorShell,
  breadcrumbSchema,
} from "@/components/healthyu/calculator-shell";
import {
  ACTIVITY,
  bmiCategory,
  calcBMI,
  calcBMR,
  calcBodyFat,
  calcHeartRateZones,
  calcIdealWeight,
  calcMacros,
  calcTDEE,
  calcWaterIntake,
} from "@/lib/calculators";

type Slug =
  | "bmi"
  | "bmr"
  | "tdee"
  | "body-fat"
  | "ideal-weight"
  | "water-intake"
  | "macro"
  | "heart-rate-zone";

const META: Record<Slug, { title: string; description: string; h1: string; intro: string }> = {
  bmi: {
    title: "Kalkulator BMI Online Gratis — Indeks Massa Tubuh | HealthyU",
    description:
      "Hitung BMI (Indeks Massa Tubuh) Anda secara gratis. Akurat sesuai standar WHO untuk dewasa Indonesia.",
    h1: "Kalkulator BMI",
    intro: "Masukkan berat dan tinggi badan untuk mengetahui Indeks Massa Tubuh Anda.",
  },
  bmr: {
    title: "Kalkulator BMR — Basal Metabolic Rate | HealthyU",
    description:
      "Hitung BMR (kalori istirahat) dengan rumus Mifflin-St Jeor — paling akurat.",
    h1: "Kalkulator BMR",
    intro: "Hitung jumlah kalori yang dibakar tubuh saat istirahat total.",
  },
  tdee: {
    title: "Kalkulator TDEE — Kebutuhan Kalori Harian | HealthyU",
    description:
      "Hitung TDEE (total kalori harian) berdasarkan aktivitas. Untuk diet, bulking, atau maintenance.",
    h1: "Kalkulator TDEE",
    intro: "Total kalori yang Anda butuhkan per hari berdasarkan tingkat aktivitas.",
  },
  "body-fat": {
    title: "Kalkulator Persentase Lemak Tubuh | HealthyU",
    description: "Estimasi % lemak tubuh dengan rumus Deurenberg berbasis BMI.",
    h1: "Kalkulator Body Fat",
    intro: "Estimasi persentase lemak tubuh Anda secara cepat.",
  },
  "ideal-weight": {
    title: "Kalkulator Berat Badan Ideal | HealthyU",
    description: "Hitung berat badan ideal sesuai tinggi & jenis kelamin (rumus Devine).",
    h1: "Berat Badan Ideal",
    intro: "Berapa berat ideal Anda berdasarkan tinggi dan jenis kelamin.",
  },
  "water-intake": {
    title: "Kalkulator Kebutuhan Air Harian | HealthyU",
    description:
      "Hitung berapa liter air yang harus diminum per hari sesuai berat badan & aktivitas.",
    h1: "Kebutuhan Air Harian",
    intro: "Berapa banyak air yang harus Anda minum tiap hari.",
  },
  macro: {
    title: "Kalkulator Makro — Protein, Karbo, Lemak | HealthyU",
    description: "Hitung kebutuhan makro harian untuk diet, maintenance, atau bulking.",
    h1: "Kalkulator Makronutrien",
    intro: "Pecah kalori harian Anda menjadi protein, karbohidrat, dan lemak.",
  },
  "heart-rate-zone": {
    title: "Kalkulator Zona Detak Jantung untuk Olahraga | HealthyU",
    description:
      "Hitung 5 zona detak jantung untuk pemulihan, bakar lemak, hingga maksimal.",
    h1: "Zona Detak Jantung",
    intro: "Temukan zona detak jantung optimal untuk olahraga Anda.",
  },
};

const SLUGS = Object.keys(META) as Slug[];

export const Route = createFileRoute("/kalkulator/$slug")({
  beforeLoad: ({ params }) => {
    if (!SLUGS.includes(params.slug as Slug)) throw notFound();
  },
  head: ({ params }) => {
    const slug = params.slug as Slug;
    const meta = META[slug];
    if (!meta) return {};
    const url = canonical(`/kalkulator/${slug}`);
    return {
      meta: [
        { title: meta.title },
        { name: "description", content: meta.description },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbSchema([
              { name: "Beranda", to: "/" },
              { name: "Kalkulator", to: "/kalkulator" },
              { name: meta.h1, to: `/kalkulator/${slug}` },
            ]),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: meta.h1,
            description: meta.description,
            step: [
              { "@type": "HowToStep", name: "Masukkan data", text: meta.intro },
              {
                "@type": "HowToStep",
                name: "Lihat hasil",
                text: "Hasil otomatis muncul tanpa perlu submit.",
              },
            ],
          }),
        },
      ],
    };
  },
  component: CalcPage,
  notFoundComponent: () => <div className="p-8">Kalkulator tidak ditemukan.</div>,
});

function CalcPage() {
  const { slug } = Route.useParams();
  const meta = META[slug as Slug];
  const breadcrumbs = [
    { name: "Beranda", to: "/" },
    { name: "Kalkulator", to: "/kalkulator" },
    { name: meta.h1, to: `/kalkulator/${slug}` },
  ];
  return (
    <CalculatorShell title={meta.h1} description={meta.intro} breadcrumbs={breadcrumbs}>
      <CalcSwitcher slug={slug as Slug} />
    </CalculatorShell>
  );
}

function CalcSwitcher({ slug }: { slug: Slug }) {
  switch (slug) {
    case "bmi":
      return <BMIForm />;
    case "bmr":
      return <BMRForm />;
    case "tdee":
      return <TDEEForm />;
    case "body-fat":
      return <BodyFatForm />;
    case "ideal-weight":
      return <IdealWeightForm />;
    case "water-intake":
      return <WaterForm />;
    case "macro":
      return <MacroForm />;
    case "heart-rate-zone":
      return <HRForm />;
  }
}

// === Reusable inputs ===
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-lg bg-primary/10 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

// === Calc forms ===
function BMIForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const bmi = calcBMI(w, h);
  return (
    <div className="space-y-4">
      <Field label="Berat (kg)">
        <input
          type="number"
          value={w}
          onChange={(e) => setW(+e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Tinggi (cm)">
        <input
          type="number"
          value={h}
          onChange={(e) => setH(+e.target.value)}
          className={inputCls}
        />
      </Field>
      <Result label="BMI Anda" value={`${bmi.toFixed(1)} — ${bmiCategory(bmi)}`} />
    </div>
  );
}

function PersonInputs({
  w,
  h,
  age,
  sex,
  setW,
  setH,
  setAge,
  setSex,
}: {
  w: number;
  h: number;
  age: number;
  sex: "male" | "female";
  setW: (v: number) => void;
  setH: (v: number) => void;
  setAge: (v: number) => void;
  setSex: (v: "male" | "female") => void;
}) {
  return (
    <>
      <Field label="Berat (kg)">
        <input type="number" value={w} onChange={(e) => setW(+e.target.value)} className={inputCls} />
      </Field>
      <Field label="Tinggi (cm)">
        <input type="number" value={h} onChange={(e) => setH(+e.target.value)} className={inputCls} />
      </Field>
      <Field label="Usia (tahun)">
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(+e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Jenis kelamin">
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value as "male" | "female")}
          className={inputCls}
        >
          <option value="male">Laki-laki</option>
          <option value="female">Perempuan</option>
        </select>
      </Field>
    </>
  );
}

function BMRForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const bmr = calcBMR(w, h, age, sex);
  return (
    <div className="space-y-4">
      <PersonInputs w={w} h={h} age={age} sex={sex} setW={setW} setH={setH} setAge={setAge} setSex={setSex} />
      <Result label="BMR Anda" value={`${Math.round(bmr)} kkal/hari`} />
    </div>
  );
}

function TDEEForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [act, setAct] = useState<keyof typeof ACTIVITY>("moderate");
  const bmr = calcBMR(w, h, age, sex);
  const tdee = calcTDEE(bmr, act);
  return (
    <div className="space-y-4">
      <PersonInputs w={w} h={h} age={age} sex={sex} setW={setW} setH={setH} setAge={setAge} setSex={setSex} />
      <Field label="Tingkat aktivitas">
        <select
          value={act}
          onChange={(e) => setAct(e.target.value as keyof typeof ACTIVITY)}
          className={inputCls}
        >
          {Object.entries(ACTIVITY).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <Result label="TDEE Anda" value={`${Math.round(tdee)} kkal/hari`} />
    </div>
  );
}

function BodyFatForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const bmi = calcBMI(w, h);
  const bf = calcBodyFat(bmi, age, sex);
  return (
    <div className="space-y-4">
      <PersonInputs w={w} h={h} age={age} sex={sex} setW={setW} setH={setH} setAge={setAge} setSex={setSex} />
      <Result label="Estimasi Body Fat" value={`${bf.toFixed(1)} %`} />
    </div>
  );
}

function IdealWeightForm() {
  const [h, setH] = useState(165);
  const [sex, setSex] = useState<"male" | "female">("male");
  const iw = calcIdealWeight(h, sex);
  return (
    <div className="space-y-4">
      <Field label="Tinggi (cm)">
        <input type="number" value={h} onChange={(e) => setH(+e.target.value)} className={inputCls} />
      </Field>
      <Field label="Jenis kelamin">
        <select value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")} className={inputCls}>
          <option value="male">Laki-laki</option>
          <option value="female">Perempuan</option>
        </select>
      </Field>
      <Result label="Berat Ideal" value={`${iw.toFixed(1)} kg`} />
    </div>
  );
}

function WaterForm() {
  const [w, setW] = useState(60);
  const [act, setAct] = useState<keyof typeof ACTIVITY>("moderate");
  const ml = calcWaterIntake(w, act);
  return (
    <div className="space-y-4">
      <Field label="Berat (kg)">
        <input type="number" value={w} onChange={(e) => setW(+e.target.value)} className={inputCls} />
      </Field>
      <Field label="Aktivitas">
        <select value={act} onChange={(e) => setAct(e.target.value as keyof typeof ACTIVITY)} className={inputCls}>
          {Object.entries(ACTIVITY).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <Result label="Kebutuhan air" value={`${(ml / 1000).toFixed(2)} liter / hari`} />
    </div>
  );
}

function MacroForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [act, setAct] = useState<keyof typeof ACTIVITY>("moderate");
  const [goal, setGoal] = useState<"cut" | "maintain" | "bulk">("maintain");
  const tdee = calcTDEE(calcBMR(w, h, age, sex), act);
  const { calories, macros } = calcMacros(tdee, goal);
  return (
    <div className="space-y-4">
      <PersonInputs w={w} h={h} age={age} sex={sex} setW={setW} setH={setH} setAge={setAge} setSex={setSex} />
      <Field label="Aktivitas">
        <select value={act} onChange={(e) => setAct(e.target.value as keyof typeof ACTIVITY)} className={inputCls}>
          {Object.entries(ACTIVITY).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tujuan">
        <select value={goal} onChange={(e) => setGoal(e.target.value as "cut" | "maintain" | "bulk")} className={inputCls}>
          <option value="cut">Diet (defisit)</option>
          <option value="maintain">Pertahankan</option>
          <option value="bulk">Naikkan massa</option>
        </select>
      </Field>
      <Result label="Kalori target" value={`${Math.round(calories)} kkal`} />
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Protein</div>
          <div className="font-semibold">{Math.round(macros.protein)} g</div>
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Karbo</div>
          <div className="font-semibold">{Math.round(macros.carbs)} g</div>
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Lemak</div>
          <div className="font-semibold">{Math.round(macros.fat)} g</div>
        </div>
      </div>
    </div>
  );
}

function HRForm() {
  const [age, setAge] = useState(28);
  const { max, zones } = calcHeartRateZones(age);
  return (
    <div className="space-y-4">
      <Field label="Usia (tahun)">
        <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} />
      </Field>
      <Result label="Detak jantung maksimum" value={`${Math.round(max)} bpm`} />
      <ul className="mt-3 space-y-2 text-sm">
        {zones.map((z) => (
          <li key={z.name} className="flex justify-between rounded-md bg-muted px-3 py-2">
            <span>{z.name}</span>
            <span className="font-mono">
              {Math.round(z.min)}–{Math.round(z.max)} bpm
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}