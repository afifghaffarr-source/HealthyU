import { TrendingUp, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

export const MOOD_VALUES = [1, 2, 3, 4, 5] as const;
export const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"] as const;

const MOOD_KEY_MAP: Record<number, TranslationKey> = {
  1: "common.moods.bad",
  2: "common.moods.low",
  3: "common.moods.neutral",
  4: "common.moods.good",
  5: "common.moods.great",
};

export function moodLabel(v: number, t: (k: TranslationKey) => string): string {
  return t(MOOD_KEY_MAP[v] ?? "common.moods.neutral");
}

const MOODS_FALLBACK = [
  { v: 1, e: "😢", label: "Buruk" },
  { v: 2, e: "😕", label: "Kurang" },
  { v: 3, e: "😐", label: "Biasa" },
  { v: 4, e: "🙂", label: "Baik" },
  { v: 5, e: "😄", label: "Hebat" },
] as const;

export function MoodTrendCard({
  last14,
  trendAvg,
}: {
  last14: { d: string; label: string; v: number | null }[];
  trendAvg: number | null;
}) {
  const { t } = useTranslation();
  const moods = MOODS_FALLBACK.map((m) => ({ ...m, label: moodLabel(m.v, t) }));
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 outline-1 outline-black/5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="size-3" /> {t("mood.trend14")}
        </div>
        {trendAvg != null && (
          <span className="text-xs font-semibold tabular-nums">
            {t("mood.avgShort")} {trendAvg.toFixed(1)}{" "}
            {moods.find((m) => Math.round(trendAvg) === m.v)?.e}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1 h-20">
        {last14.map((d, i) => {
          const h = d.v == null ? 6 : 12 + (d.v / 5) * 56;
          const color =
            d.v == null
              ? "bg-muted"
              : d.v >= 4
                ? "bg-emerald-400"
                : d.v >= 3
                  ? "bg-amber-300"
                  : "bg-rose-400";
          return (
            <div
              key={d.d}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${d.d}: ${d.v?.toFixed(1) ?? "—"}`}
            >
              <div
                className={`w-full rounded-md ${color} transition-all`}
                style={{ height: `${h}px` }}
              />
              {i % 2 === 0 && (
                <span className="text-[9px] text-muted-foreground tabular-nums">{d.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MoodComposer({
  mood,
  setMood,
  note,
  setNote,
  onSave,
  saving,
}: {
  mood: number | null;
  setMood: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const moods = MOODS_FALLBACK.map((m) => ({ ...m, label: moodLabel(m.v, t) }));
  return (
    <section className="rounded-3xl bg-card p-5 outline-1 outline-black/5">
      <p className="text-sm font-semibold mb-3">{t("mood.howFeel")}</p>
      <div className="flex justify-between gap-2">
        {moods.map((m) => (
          <button
            key={m.v}
            onClick={() => setMood(m.v)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition ${
              mood === m.v
                ? "bg-primary/10 outline-2 outline-primary"
                : "bg-muted/50 outline-1 outline-black/5"
            }`}
          >
            <span className="text-2xl">{m.e}</span>
            <span className="text-[10px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("mood.notePlaceholder")}
        rows={3}
        maxLength={500}
        className="mt-4 w-full rounded-2xl bg-muted/40 p-3 text-sm outline-1 outline-black/5 resize-none focus:outline-primary"
      />
      <button
        disabled={!mood || saving}
        onClick={onSave}
        className="mt-3 w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {t("common.save")}
      </button>
    </section>
  );
}

export function MoodHistoryItem({
  log,
  onDelete,
}: {
  log: { id: string; mood: number; logged_at: string; note?: string | null };
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const moods = MOODS_FALLBACK.map((m) => ({ ...m, label: moodLabel(m.v, t) }));
  const m = moods.find((x) => x.v === log.mood);
  return (
    <li className="rounded-2xl bg-card p-3 outline-1 outline-black/5 flex gap-3">
      <div className="size-11 rounded-xl bg-primary/10 grid place-items-center text-2xl">
        {m?.e ?? "🙂"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{m?.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(log.logged_at).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {log.note && <p className="text-xs text-muted-foreground mt-0.5 break-words">{log.note}</p>}
      </div>
      <button
        onClick={() => onDelete(log.id)}
        className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition"
        aria-label={t("common.delete")}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
