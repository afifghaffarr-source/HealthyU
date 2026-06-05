import { useState } from "react";
import {
  ACTIVITY,
  calcBMR,
  calcHeartRateZones,
  calcIdealWeight,
  calcMacros,
  calcTDEE,
  calcWaterIntake,
} from "@/lib/calculators";
import { Field, PersonInputs, Result, inputCls } from "./CalcFormsShared";

export function IdealWeightForm() {
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

export function WaterForm() {
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

export function MacroForm() {
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

export function HRForm() {
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