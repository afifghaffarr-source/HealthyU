import {
  bmi as calcBmi,
  bmiCategory,
  bmr as calcBmr,
  tdee as calcTdee,
  waterTargetMl,
  ageFromBirthDate,
} from "@/lib/localCalc";

type Profile = {
  weight_kg?: number | string | null;
  height_cm?: number | string | null;
  birth_date?: string | null;
  gender?: string | null;
  activity_level?: string | null;
};

export function SnapshotCard({
  profile,
  latestWeightKg,
}: {
  profile?: Profile | null;
  latestWeightKg?: number | string | null;
}) {
  const weight = Number(latestWeightKg ?? profile?.weight_kg ?? 0);
  const height = Number(profile?.height_cm ?? 0);
  const age = ageFromBirthDate(profile?.birth_date as string | null | undefined);
  const activity = profile?.activity_level ?? "sedentary";
  if (!weight || !height || !age) return null;
  const bmiVal = calcBmi(weight, height);
  const cat = bmiCategory(bmiVal);
  const bmrVal = calcBmr({
    weightKg: weight,
    heightCm: height,
    ageYears: age,
    gender: profile?.gender,
  });
  const tdeeVal = calcTdee(bmrVal, activity);
  const waterMl = waterTargetMl(weight, activity);
  const catColor =
    cat === "normal"
      ? "text-emerald-600"
      : cat === "underweight"
        ? "text-sky-600"
        : cat === "overweight"
          ? "text-amber-600"
          : "text-red-600";
  const catLabel =
    cat === "normal"
      ? "Normal"
      : cat === "underweight"
        ? "Kurus"
        : cat === "overweight"
          ? "Berlebih"
          : "Obesitas";
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
        Snapshot · dihitung otomatis
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">BMI</p>
          <p className="text-sm font-bold tabular-nums">{bmiVal.toFixed(1)}</p>
          <p className={`text-[10px] font-semibold ${catColor}`}>{catLabel}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">BMR</p>
          <p className="text-sm font-bold tabular-nums">{bmrVal}</p>
          <p className="text-[10px] text-muted-foreground">kcal</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">TDEE</p>
          <p className="text-sm font-bold tabular-nums">{tdeeVal}</p>
          <p className="text-[10px] text-muted-foreground">kcal</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Air</p>
          <p className="text-sm font-bold tabular-nums">{(waterMl / 1000).toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">L/hari</p>
        </div>
      </div>
    </section>
  );
}
