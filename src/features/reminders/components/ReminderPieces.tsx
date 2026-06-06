import {
  Bell,
  BellOff,
  Droplet,
  Utensils,
  Dumbbell,
  Moon,
  Pill,
  Timer,
  Sparkles,
  Trash2,
  MoonStar,
} from "lucide-react";
import type { Reminder, ReminderCategory } from "@/lib/reminders-store";

export const CATEGORY_META: Record<ReminderCategory, { icon: typeof Bell; label: string }> = {
  water: { icon: Droplet, label: "Air" },
  meal: { icon: Utensils, label: "Makan" },
  workout: { icon: Dumbbell, label: "Olahraga" },
  sleep: { icon: Moon, label: "Tidur" },
  medication: { icon: Pill, label: "Obat" },
  fasting: { icon: Timer, label: "Puasa" },
  prayer: { icon: MoonStar, label: "Sholat" },
  custom: { icon: Sparkles, label: "Lain" },
};

export const DAY_LABELS = ["M", "S", "S", "R", "K", "J", "S"];

export function NextReminderSummary({
  activeCount,
  total,
  next,
  fmtCountdown,
}: {
  activeCount: number;
  total: number;
  next: (Reminder & { min: number }) | null;
  fmtCountdown: (min: number) => string;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white animate-fade-up"
      style={{
        background: "linear-gradient(135deg, oklch(0.62 0.16 195) 0%, oklch(0.58 0.18 250) 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider opacity-80">Pengingat aktif</div>
          <div className="text-3xl font-bold mt-1">
            {activeCount}
            <span className="text-base font-medium opacity-80">/{total}</span>
          </div>
        </div>
        <div className="size-12 rounded-2xl bg-white/15 grid place-items-center">
          <Bell className="size-5" />
        </div>
      </div>
      {next ? (
        <div className="mt-4 bg-white/15 rounded-2xl p-3 flex items-center gap-3">
          {(() => {
            const Icon = (CATEGORY_META[next.category] ?? CATEGORY_META.custom).icon;
            return (
              <div className="size-9 rounded-xl bg-white/20 grid place-items-center">
                <Icon className="size-4" />
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] opacity-80">Berikutnya</div>
            <div className="text-sm font-semibold truncate">
              {next.label} · {next.time}
            </div>
          </div>
          <div className="text-xs font-medium opacity-90">{fmtCountdown(next.min)}</div>
        </div>
      ) : (
        <div className="mt-4 text-xs opacity-80">Tidak ada pengingat tersisa hari ini</div>
      )}
    </section>
  );
}

export function AddReminderForm({
  newLabel,
  setNewLabel,
  newTime,
  setNewTime,
  newCategory,
  setNewCategory,
  onCancel,
  onAdd,
}: {
  newLabel: string;
  setNewLabel: (v: string) => void;
  newTime: string;
  setNewTime: (v: string) => void;
  newCategory: ReminderCategory;
  setNewCategory: (v: ReminderCategory) => void;
  onCancel: () => void;
  onAdd: () => void;
}) {
  return (
    <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <input
        type="text"
        placeholder="Nama pengingat"
        value={newLabel}
        onChange={(e) => setNewLabel(e.target.value)}
        className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
      />
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          className="bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as ReminderCategory)}
          className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
        >
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 bg-muted text-foreground font-semibold py-2.5 rounded-xl text-sm"
        >
          Batal
        </button>
        <button
          onClick={onAdd}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm"
        >
          Simpan
        </button>
      </div>
    </section>
  );
}

export function ReminderRow({
  it,
  onToggle,
  onUpdateLabel,
  onUpdateTime,
  onToggleDay,
  onRemove,
}: {
  it: Reminder;
  onToggle: () => void;
  onUpdateLabel: (v: string) => void;
  onUpdateTime: (v: string) => void;
  onToggleDay: (day: number) => void;
  onRemove: () => void;
}) {
  const Meta = CATEGORY_META[it.category] ?? CATEGORY_META.custom;
  const Icon = it.enabled ? Meta.icon : BellOff;
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-xl grid place-items-center ${it.enabled ? "bg-mint" : "bg-muted"}`}
        >
          <Icon className={`size-4 ${it.enabled ? "text-sage-deep" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={it.label}
            onChange={(e) => onUpdateLabel(e.target.value)}
            className="font-semibold text-sm bg-transparent outline-none w-full"
            aria-label="Nama pengingat"
          />
          <input
            type="time"
            value={it.time}
            onChange={(e) => onUpdateTime(e.target.value)}
            className="text-xs text-muted-foreground bg-transparent outline-none mt-0.5"
          />
        </div>
        <button
          onClick={onToggle}
          className={`w-11 h-6 rounded-full transition-colors relative ${it.enabled ? "bg-primary" : "bg-muted"}`}
          aria-label="Toggle"
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${it.enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
        <button
          onClick={onRemove}
          className="size-8 grid place-items-center text-muted-foreground hover:text-destructive"
          aria-label="Hapus"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 pl-13">
        {DAY_LABELS.map((d, idx) => {
          const active = it.days.length === 0 || it.days.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => onToggleDay(idx)}
              className={`size-7 rounded-lg text-[11px] font-semibold transition-colors ${
                active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {d}
            </button>
          );
        })}
        <span className="text-[10px] text-muted-foreground ml-1">
          {it.days.length === 0 ? "Setiap hari" : `${it.days.length} hari`}
        </span>
      </div>
    </div>
  );
}
