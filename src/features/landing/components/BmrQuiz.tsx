import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bmrRangeFor, trackBmrQuizEvent } from "@/features/admin/lib/adminExperiments.functions";
import { getOrCreateSessionId } from "@/hooks/use-experiments";

export function BmrQuiz() {
  const [g, setG] = useState<"m" | "f">("m");
  const [age, setAge] = useState(25);
  const [w, setW] = useState(65);
  const [h, setH] = useState(170);
  const bmr = Math.round(
    g === "m" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161,
  );

  // Sprint 58-J — debounced completion telemetry. Fires once per "settled"
  // input change (1.5s of no further edits) so we capture intent, not
  // every keystroke. ponytail: piggyback on error_reports.
  const lastFiredRef = useRef<string>("");
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const range = bmrRangeFor(bmr);
      const fingerprint = `${g}-${age}-${w}-${h}-${range}`;
      if (lastFiredRef.current === fingerprint) return; // dedup identical
      lastFiredRef.current = fingerprint;
      const sessionId = getOrCreateSessionId();
      void supabase.auth.getSession().then(({ data: sess }) => {
        void trackBmrQuizEvent({
          data: {
            gender: g,
            age,
            weight: w,
            height: h,
            bmr,
            bmrRange: range,
            sessionId,
            userId: sess?.session?.user?.id ?? null,
          },
        }).catch(() => {
          /* swallow — telemetry must not crash the app */
        });
      });
    }, 1500);
    return () => window.clearTimeout(handle);
  }, [g, age, w, h, bmr]);
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
