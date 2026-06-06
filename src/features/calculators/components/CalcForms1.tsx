import { useState } from "react";
import { ACTIVITY, bmiCategory, calcBMI, calcBMR, calcBodyFat, calcTDEE } from "@/lib/calculators";
import { Field, PersonInputs, Result, inputCls } from "./CalcFormsShared";

export function BMIForm() {
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

export function BMRForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const bmr = calcBMR(w, h, age, sex);
  return (
    <div className="space-y-4">
      <PersonInputs
        w={w}
        h={h}
        age={age}
        sex={sex}
        setW={setW}
        setH={setH}
        setAge={setAge}
        setSex={setSex}
      />
      <Result label="BMR Anda" value={`${Math.round(bmr)} kkal/hari`} />
    </div>
  );
}

export function TDEEForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [act, setAct] = useState<keyof typeof ACTIVITY>("moderate");
  const bmr = calcBMR(w, h, age, sex);
  const tdee = calcTDEE(bmr, act);
  return (
    <div className="space-y-4">
      <PersonInputs
        w={w}
        h={h}
        age={age}
        sex={sex}
        setW={setW}
        setH={setH}
        setAge={setAge}
        setSex={setSex}
      />
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

export function BodyFatForm() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(165);
  const [age, setAge] = useState(28);
  const [sex, setSex] = useState<"male" | "female">("male");
  const bmi = calcBMI(w, h);
  const bf = calcBodyFat(bmi, age, sex);
  return (
    <div className="space-y-4">
      <PersonInputs
        w={w}
        h={h}
        age={age}
        sex={sex}
        setW={setW}
        setH={setH}
        setAge={setAge}
        setSex={setSex}
      />
      <Result label="Estimasi Body Fat" value={`${bf.toFixed(1)} %`} />
    </div>
  );
}
