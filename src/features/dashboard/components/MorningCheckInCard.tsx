import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sun } from "lucide-react";
import { toast } from "sonner";
import { addMood } from "@/features/mood/lib/mood.functions";

/**
 * 10-second morning check-in: mood + energy + 1 intention.
 * Only renders 05:00–11:59 and only once per day (local flag).
 * Persists via existing addMood server fn (no schema change) — encodes
 * energy & intention into the note field.
 */
const ENERGY = [
  { v: "rendah", label: "Rendah", mood: 2 },
  { v: "biasa", label: "Biasa", mood: 3 },
  { v: "tinggi", label: "Tinggi", mood: 5 },
] as const;

const INTENTIONS = [
  "Catat makan lengkap",
  "Minum air cukup",
  "Jalan kaki 20 menit",
  "Tidur cukup malam ini",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function MorningCheckInCard() {
  const qc = useQueryClient();
  const addMoodFn = useServerFn(addMood);
  const storageKey = `morning-checkin:${todayKey()}`;
  const [done, setDone] = useState(true); // assume done until we hydrate
  const [energy, setEnergy] = useState<(typeof ENERGY)[number]["v"] | null>(null);
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDone(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const mut = useMutation({
    mutationFn: async () => {
      const e = ENERGY.find((x) => x.v === energy) ?? ENERGY[1];
      const note = `[pagi] energi: ${e.label}${intent ? ` · niat: ${intent}` : ""}`;
      await addMoodFn({ data: { mood: e.mood, note } });
    },
    onSuccess: () => {
      window.localStorage.setItem(storageKey, "1");
      setDone(true);
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Check-in pagi tercatat ☀️");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hour = new Date().getHours();
  if (hour < 5 || hour >= 12) return null;
  if (done) return null;

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <span className="size-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200 grid place-items-center" aria-hidden>
          <Sun className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Check-in pagi 10 detik</p>
          <p className="text-[11px] text-muted-foreground">Energi & 1 niat hari ini.</p>
        </div>
      </div>
      <div className="flex gap-2">
        {ENERGY.map((e) => (
          <button
            key={e.v}
            type="button"
            onClick={() => setEnergy(e.v)}
            className={`flex-1 text-xs font-semibold py-2 rounded-xl min-h-9 transition ${
              energy === e.v ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
            aria-pressed={energy === e.v}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {INTENTIONS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIntent(intent === i ? null : i)}
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-full min-h-9 transition ${
              intent === i
                ? "bg-primary/15 text-primary outline-1 outline-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
            aria-pressed={intent === i}
          >
            {i}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!energy || mut.isPending}
        onClick={() => mut.mutate()}
        className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded-xl min-h-11 disabled:opacity-50"
      >
        {mut.isPending ? "Menyimpan…" : "Simpan check-in"}
      </button>
    </section>
  );
}