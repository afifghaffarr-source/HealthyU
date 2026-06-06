import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function BmrQuiz() {
  const [g, setG] = useState<"m" | "f">("m");
  const [age, setAge] = useState(25);
  const [w, setW] = useState(65);
  const [h, setH] = useState(170);
  const bmr = Math.round(
    g === "m" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161,
  );
  return (
    <div className="glass rounded-3xl p-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Hitung BMR-mu (gratis, 5 detik)
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          Gender
          <select
            value={g}
            onChange={(e) => setG(e.target.value as "m" | "f")}
            className="bg-card border border-white/15 rounded-lg px-2 py-1.5"
          >
            <option value="m">Pria</option>
            <option value="f">Wanita</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Umur
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(+e.target.value)}
            className="bg-card border border-white/15 rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          Berat (kg)
          <input
            type="number"
            value={w}
            onChange={(e) => setW(+e.target.value)}
            className="bg-card border border-white/15 rounded-lg px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          Tinggi (cm)
          <input
            type="number"
            value={h}
            onChange={(e) => setH(+e.target.value)}
            className="bg-card border border-white/15 rounded-lg px-2 py-1.5"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-primary/15 to-accent/15 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Kebutuhan basal harian</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {bmr.toLocaleString("id-ID")}{" "}
            <span className="text-sm font-normal text-muted-foreground">kkal</span>
          </p>
        </div>
        <Link
          to="/auth"
          className="bg-primary text-primary-foreground font-semibold text-xs px-3 py-2 rounded-xl"
        >
          Lihat meal plan
        </Link>
      </div>
    </div>
  );
}
