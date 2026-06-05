import type React from "react";

export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-lg bg-primary/10 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export function PersonInputs({
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
        <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} className={inputCls} />
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