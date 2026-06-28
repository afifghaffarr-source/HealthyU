import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Moon } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { addMood } from "@/features/mood/lib/mood.functions";

/**
 * Evening reflection: 1 question — "Apa kemenangan kecil hari ini?".
 * Renders 18:00–23:59, once per day. Persists via addMood (mood=4) with
 * the reflection text in `note`. No schema change.
 */
const CHIPS = [
  "Catat semua makan",
  "Cukup air",
  "Bergerak sedikit",
  "Tidak ngemil berlebih",
  "Tidur lebih awal",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function EveningReflectionCard() {
  const qc = useQueryClient();
  const addMoodFn = useServerFn(addMood);
  const storageKey = `evening-reflect:${todayKey()}`;
  const [done, setDone] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    setDone(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const mut = useMutation({
    mutationFn: async () => {
      const win = (text.trim() || pick || "").slice(0, 200);
      if (!win) return;
      await addMoodFn({ data: { mood: 4, note: `[malam] menang: ${win}` } });
    },
    onSuccess: () => {
      window.localStorage.setItem(storageKey, "1");
      setDone(true);
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Disimpan. Sampai jumpa besok 🌙");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hour = new Date().getHours();
  if (hour < 18) return null;
  if (done) return null;

  const canSave = (pick || text.trim().length > 0) && !mut.isPending;

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <span
          className="size-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 grid place-items-center"
          aria-hidden
        >
          <Moon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Refleksi singkat</p>
          <p className="text-[11px] text-muted-foreground">Apa kemenangan kecilmu hari ini?</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setPick(pick === c ? null : c)}
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-full min-h-9 transition ${
              pick === c
                ? "bg-primary/15 text-primary outline-1 outline-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
            aria-pressed={pick === c}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        placeholder="Atau tulis sendiri…"
        className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-11"
      />
      <button
        type="button"
        disabled={!canSave}
        onClick={() => mut.mutate()}
        className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded-xl min-h-11 disabled:opacity-50"
      >
        {mut.isPending ? "Menyimpan…" : "Simpan refleksi"}
      </button>
    </section>
  );
}
