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
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

export const CATEGORY_ICONS: Record<ReminderCategory, typeof Bell> = {
  water: Droplet,
  meal: Utensils,
  workout: Dumbbell,
  sleep: Moon,
  medication: Pill,
  fasting: Timer,
  prayer: MoonStar,
  custom: Sparkles,
};

const CATEGORY_KEY_MAP: Record<ReminderCategory, TranslationKey> = {
  water: "reminder.catWater",
  meal: "reminder.catMeal",
  workout: "reminder.catWorkout",
  sleep: "reminder.catSleep",
  medication: "reminder.catMedication",
  fasting: "reminder.catFasting",
  prayer: "reminder.catPrayer",
  custom: "reminder.catCustom",
};

export function categoryLabel(cat: ReminderCategory, t: (k: TranslationKey) => string): string {
  return t(CATEGORY_KEY_MAP[cat]);
}

export function getCategoryMeta(cat: ReminderCategory, t: (k: TranslationKey) => string) {
  return { icon: CATEGORY_ICONS[cat], label: categoryLabel(cat, t) };
}

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
  const { t } = useTranslation();
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white animate-fade-up"
      style={{
        background: "linear-gradient(135deg, oklch(0.62 0.16 195) 0%, oklch(0.58 0.18 250) 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider opacity-80">
            {t("reminder.active")}
          </div>
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
            const Icon = CATEGORY_ICONS[next.category] ?? CATEGORY_ICONS.custom;
            return (
              <div className="size-9 rounded-xl bg-white/20 grid place-items-center">
                <Icon className="size-4" />
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] opacity-80">{t("reminder.next")}</div>
            <div className="text-sm font-semibold truncate">
              {next.label} · {next.time}
            </div>
          </div>
          <div className="text-xs font-medium opacity-90">{fmtCountdown(next.min)}</div>
        </div>
      ) : (
        <div className="mt-4 text-xs opacity-80">{t("reminder.noneToday")}</div>
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
  const { t } = useTranslation();
  return (
    <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <input
        type="text"
        placeholder={t("reminder.namePlaceholder")}
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
          {(Object.keys(CATEGORY_ICONS) as ReminderCategory[]).map((k) => (
            <option key={k} value={k}>
              {categoryLabel(k, t)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 bg-muted text-foreground font-semibold py-2.5 rounded-xl text-sm"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={onAdd}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm"
        >
          {t("common.save")}
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
  const { t } = useTranslation();
  const Meta = getCategoryMeta(it.category, t);
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
            aria-label={t("reminder.namePlaceholder")}
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
          aria-label={t("reminder.toggle")}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${it.enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
        <button
          onClick={onRemove}
          className="size-8 grid place-items-center text-muted-foreground hover:text-destructive"
          aria-label={t("common.delete")}
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
          {it.days.length === 0
            ? t("reminder.everyDay")
            : t("reminder.nDays").replace("{n}", String(it.days.length))}
        </span>
      </div>
    </div>
  );
}
