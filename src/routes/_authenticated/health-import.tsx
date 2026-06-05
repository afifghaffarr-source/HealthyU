import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Upload, Apple, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { importHealthData } from "@/lib/health-import.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/health-import")({
  component: HealthImportPage,
});

type Parsed = {
  source: "apple_health" | "samsung_health";
  steps: { day: string; steps: number }[];
  weight: { logged_at: string; weight_kg: number }[];
  workouts: { performed_at: string; type: string; duration_min: number; calories_burned: number }[];
};

function HealthImportPage() {
  const importFn = useServerFn(importHealthData);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [parsing, setParsing] = useState(false);

  const mutation = useMutation({
    mutationFn: () => importFn({ data: parsed! }),
    onSuccess: (r) => {
      toast.success(
        `Berhasil: ${r.stepsCount} hari langkah, ${r.weightCount} berat, ${r.workoutCount} workout`,
      );
      setParsed(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal import"),
  });

  const handleFile = async (file: File, source: Parsed["source"]) => {
    setParsing(true);
    try {
      const text = await file.text();
      const data =
        source === "apple_health" ? parseAppleHealthXml(text) : parseSamsungCsv(text, file.name);
      setParsed({ source, ...data });
      toast.success(
        `Terdeteksi: ${data.steps.length} langkah, ${data.weight.length} berat, ${data.workouts.length} workout`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal parse file");
    } finally {
      setParsing(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Import Kesehatan" subtitle="Apple Health / Samsung Health" showBack />

        <section className="bg-card rounded-2xl p-4 outline-1 outline-black/10 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Cara ekspor data:</p>
          <p>
            <b>📱 iPhone (Apple Health):</b> Buka Health app → profile pojok kanan atas → "Export
            All Health Data" → ekstrak ZIP → upload file <code>export.xml</code> di bawah.
          </p>
          <p>
            <b>📱 Samsung Health:</b> Settings → Download personal data → ekstrak ZIP → upload file
            CSV (steps / weight / exercise).
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <SourceCard
            icon={<Apple className="size-6" />}
            label="Apple Health"
            hint="export.xml"
            accept=".xml"
            onFile={(f) => handleFile(f, "apple_health")}
            disabled={parsing}
          />
          <SourceCard
            icon={<Smartphone className="size-6" />}
            label="Samsung Health"
            hint=".csv"
            accept=".csv"
            onFile={(f) => handleFile(f, "samsung_health")}
            disabled={parsing}
          />
        </div>

        {parsing && (
          <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Memproses file...
          </p>
        )}

        {parsed && (
          <section className="bg-card rounded-2xl p-4 outline-1 outline-black/10 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> Siap diimport
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Langkah" v={parsed.steps.length} />
              <Mini label="Berat" v={parsed.weight.length} />
              <Mini label="Workout" v={parsed.workouts.length} />
            </div>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {mutation.isPending ? "Mengimport..." : "Import sekarang"}
            </button>
            <button
              onClick={() => setParsed(null)}
              className="w-full text-xs text-muted-foreground"
            >
              Batal
            </button>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function SourceCard({
  icon,
  label,
  hint,
  accept,
  onFile,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accept: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`bg-card rounded-2xl p-4 outline-1 outline-black/10 flex flex-col gap-2 cursor-pointer hover:bg-secondary/40 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {icon}
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-muted/60 rounded-xl p-2">
      <p className="text-base font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ---- Parsers ----

function parseAppleHealthXml(xml: string): Omit<Parsed, "source"> {
  const steps: Record<string, number> = {};
  const weight: { logged_at: string; weight_kg: number }[] = [];
  const workouts: {
    performed_at: string;
    type: string;
    duration_min: number;
    calories_burned: number;
  }[] = [];

  // Steps & weight come from <Record .../>
  const recordRegex = /<Record\b[^>]*\/>/g;
  const attr = (s: string, name: string): string | null => {
    const m = s.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  for (const m of xml.match(recordRegex) ?? []) {
    const type = attr(m, "type");
    if (!type) continue;
    if (type === "HKQuantityTypeIdentifierStepCount") {
      const date = attr(m, "startDate")?.slice(0, 10);
      const val = Number(attr(m, "value"));
      if (date && Number.isFinite(val)) steps[date] = (steps[date] ?? 0) + val;
    } else if (type === "HKQuantityTypeIdentifierBodyMass") {
      const startDate = attr(m, "startDate");
      const unit = attr(m, "unit");
      let val = Number(attr(m, "value"));
      if (!Number.isFinite(val) || !startDate) continue;
      if (unit === "lb") val = val * 0.453592;
      weight.push({
        logged_at: new Date(startDate).toISOString(),
        weight_kg: Number(val.toFixed(2)),
      });
    }
  }

  // Workouts: <Workout workoutActivityType="..." duration="..." durationUnit="min" startDate="..." totalEnergyBurned="...">
  const workoutRegex = /<Workout\b[^>]*\/?>(?:[\s\S]*?<\/Workout>)?/g;
  for (const m of xml.match(workoutRegex) ?? []) {
    const type = attr(m, "workoutActivityType")?.replace("HKWorkoutActivityType", "") ?? "Workout";
    const startDate = attr(m, "startDate");
    const dur = Number(attr(m, "duration"));
    const cal = Number(attr(m, "totalEnergyBurned") ?? "0");
    if (!startDate || !Number.isFinite(dur)) continue;
    workouts.push({
      performed_at: new Date(startDate).toISOString(),
      type,
      duration_min: Math.max(1, Math.round(dur)),
      calories_burned: Math.max(0, Math.round(Number.isFinite(cal) ? cal : 0)),
    });
  }

  return {
    steps: Object.entries(steps).map(([day, s]) => ({ day, steps: Math.round(s) })),
    weight,
    workouts,
  };
}

function parseSamsungCsv(text: string, filename: string): Omit<Parsed, "source"> {
  const lower = filename.toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("//"));
  if (lines.length < 2) return { steps: [], weight: [], workouts: [] };
  const headerIdx = lines.findIndex((l) => l.includes(","));
  const header = lines[headerIdx].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(headerIdx + 1).map((l) => l.split(","));
  const col = (name: string) => header.findIndex((h) => h.includes(name));

  if (lower.includes("step") || lower.includes("pedometer")) {
    const dateCol = col("date") >= 0 ? col("date") : col("day");
    const countCol = col("count") >= 0 ? col("count") : col("step");
    const out: Record<string, number> = {};
    for (const r of rows) {
      const day = (r[dateCol] ?? "").slice(0, 10);
      const val = Number(r[countCol]);
      if (day && Number.isFinite(val)) out[day] = (out[day] ?? 0) + val;
    }
    return {
      steps: Object.entries(out).map(([day, s]) => ({ day, steps: Math.round(s) })),
      weight: [],
      workouts: [],
    };
  }

  if (lower.includes("weight")) {
    const tCol = col("time") >= 0 ? col("time") : col("date");
    const wCol = col("weight");
    const out: { logged_at: string; weight_kg: number }[] = [];
    for (const r of rows) {
      const t = r[tCol];
      const w = Number(r[wCol]);
      if (t && Number.isFinite(w) && w > 20 && w < 400) {
        out.push({ logged_at: new Date(t).toISOString(), weight_kg: Number(w.toFixed(2)) });
      }
    }
    return { steps: [], weight: out, workouts: [] };
  }

  if (lower.includes("exercise") || lower.includes("workout")) {
    const tCol = col("start_time") >= 0 ? col("start_time") : col("time");
    const typeCol = col("type") >= 0 ? col("type") : col("exercise");
    const durCol = col("duration");
    const calCol = col("calorie");
    const out: {
      performed_at: string;
      type: string;
      duration_min: number;
      calories_burned: number;
    }[] = [];
    for (const r of rows) {
      const t = r[tCol];
      const type = r[typeCol] ?? "Exercise";
      const dur = Number(r[durCol]) / 60000; // ms → min
      const cal = Number(r[calCol] ?? "0");
      if (t && Number.isFinite(dur) && dur >= 1) {
        out.push({
          performed_at: new Date(t).toISOString(),
          type: String(type).slice(0, 60),
          duration_min: Math.round(dur),
          calories_burned: Math.max(0, Math.round(Number.isFinite(cal) ? cal : 0)),
        });
      }
    }
    return { steps: [], weight: [], workouts: out };
  }

  return { steps: [], weight: [], workouts: [] };
}
