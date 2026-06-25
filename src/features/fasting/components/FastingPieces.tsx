import { useState } from "react";
import { Check, X, Droplets, Flame, Trophy, Timer, Target, Calendar } from "lucide-react";
import { ConfirmDialog } from "@/components/healthyu/confirm-dialog";
import { FASTING_PROTOCOLS, fastingStage, formatDuration } from "@/lib/health";

// ─── Streak Display ──────────────────────────────────────────────────────────

export function StreakDisplay({
  streak,
  totalFasts,
  longestFast,
  thisWeekCount,
}: {
  streak: number;
  totalFasts: number;
  longestFast: number;
  thisWeekCount: number;
}) {
  if (streak === 0 && totalFasts === 0) return null;

  return (
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-5 rounded-3xl outline-1 outline-amber-200/50 dark:outline-amber-800/30 animate-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 grid place-items-center text-amber-600 dark:text-amber-400">
          <Flame className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{streak} hari</p>
          <p className="text-xs text-muted-foreground">Streak puasa berturut-turut 🔥</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatItem
          icon={<Trophy className="size-3.5" />}
          label="Total"
          value={`${totalFasts}`}
          sub="puasa"
        />
        <StatItem
          icon={<Timer className="size-3.5" />}
          label="Terlama"
          value={`${longestFast}j`}
          sub=""
        />
        <StatItem
          icon={<Calendar className="size-3.5" />}
          label="Minggu ini"
          value={`${thisWeekCount}`}
          sub="puasa"
        />
      </div>
    </section>
  );
}

function StatItem({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
        {icon}
      </div>
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">
        {label}
        {sub ? ` ${sub}` : ""}
      </p>
    </div>
  );
}

// ─── Active Fast Card ────────────────────────────────────────────────────────

export function ActiveFastCard({
  fast,
  elapsedMs,
  elapsedHrs,
  pct,
  onStop,
  stopping,
}: {
  fast: { id: string; protocol: string; target_hours: number | string };
  elapsedMs: number;
  elapsedHrs: number;
  pct: number;
  onStop: (id: string) => void;
  stopping: boolean;
}) {
  return (
    <section className="bg-gradient-to-br from-sage to-sage-deep text-primary-foreground p-8 rounded-[2rem] relative overflow-hidden animate-fade-up">
      <div className="absolute -right-10 -top-10 size-40 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-widest text-white/70 font-bold mb-2">
          Protokol {fast.protocol}
        </p>
        <p
          className="text-5xl font-bold tabular-nums mb-2"
          role="timer"
          aria-live="polite"
          aria-label={`Durasi puasa ${Math.floor(elapsedHrs)} jam ${Math.floor((elapsedHrs % 1) * 60)} menit dari target ${Number(fast.target_hours)} jam`}
        >
          {formatDuration(elapsedMs)}
        </p>
        <p className="text-sm text-white/80 mb-6">Target: {Number(fast.target_hours)} jam</p>
        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-coral transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm font-medium mb-3">{fastingStage(elapsedHrs)}</p>
        <p className="text-xs text-white/80 mb-6 inline-flex items-center gap-1.5">
          <Droplets className="size-3.5" aria-hidden />
          Ingat minum air ya — hidrasi bantu tubuh tetap nyaman.
        </p>
        <button
          onClick={() => onStop(fast.id)}
          disabled={stopping}
          className="w-full bg-white text-sage-deep font-bold py-3.5 rounded-2xl min-h-12"
          aria-label="Selesai puasa untuk sekarang"
        >
          Selesai untuk sekarang
        </button>
      </div>
    </section>
  );
}

// ─── Break Fast Tips ─────────────────────────────────────────────────────────

export function BreakFastTipsCard() {
  return (
    <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div>
        <p className="font-bold text-sm">Break fast bijak</p>
        <p className="text-[12px] text-muted-foreground">
          Setelah puasa, beri tubuh waktu menyesuaikan.
        </p>
      </div>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-start gap-2">
          <Droplets className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
          <span>Mulai dengan minum air hangat dulu.</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
          <span>Pilih makanan ringan: buah, kurma, atau sup hangat.</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
          <span>Makan pelan-pelan, hindari langsung porsi besar.</span>
        </li>
      </ul>
      <p className="text-[11px] text-muted-foreground">Progress kecil tetap progress.</p>
    </section>
  );
}

// ─── Protocol Picker (Enhanced) ──────────────────────────────────────────────

export function ProtocolPicker({
  onStart,
  starting,
}: {
  onStart: (p: { protocol: string; target_hours: number; is_custom?: boolean }) => void;
  starting: boolean;
}) {
  const [pending, setPending] = useState<{ protocol: string; target_hours: number } | null>(null);
  const [customHours, setCustomHours] = useState(14);
  const [showCustom, setShowCustom] = useState(false);

  const handlePick = (p: (typeof FASTING_PROTOCOLS)[number]) => {
    if (p.id === "custom") {
      setShowCustom(true);
      return;
    }
    if (p.fast > 16) {
      setPending({ protocol: p.id, target_hours: p.fast });
      return;
    }
    onStart({ protocol: p.id, target_hours: p.fast });
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case "Pemula":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "Menengah":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "Lanjutan":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
      case "Ekstrem":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    }
  };

  return (
    <section className="space-y-3 animate-fade-up">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Pilih protokol
      </h2>
      {FASTING_PROTOCOLS.filter((p) => p.id !== "ramadhan").map((p) => (
        <button
          key={p.id}
          onClick={() => handlePick(p)}
          disabled={starting || (showCustom && p.id !== "custom")}
          className={`w-full bg-card p-4 rounded-2xl outline-1 outline-black/5 text-left transition flex items-center justify-between ${p.id === "custom" && showCustom ? "ring-2 ring-primary" : ""} ${starting ? "opacity-50" : "hover:bg-secondary/40"}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold">{p.label}</p>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${difficultyColor(p.difficulty)}`}
              >
                {p.difficulty}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
          </div>
          <span className="text-primary font-bold text-sm ml-2 shrink-0">{p.fast}j →</span>
        </button>
      ))}

      {/* Custom fasting input */}
      {showCustom && (
        <div className="bg-card p-4 rounded-2xl outline-1 outline-primary/30 space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Durasi kustom</p>
            <span className="text-2xl font-bold tabular-nums text-primary">{customHours} jam</span>
          </div>
          <input
            type="range"
            min={6}
            max={36}
            step={1}
            value={customHours}
            onChange={(e) => setCustomHours(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>6 jam</span>
            <span>12 jam</span>
            <span>24 jam</span>
            <span>36 jam</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (customHours > 16) {
                setPending({ protocol: `custom:${customHours}j`, target_hours: customHours });
              } else {
                onStart({
                  protocol: `custom:${customHours}j`,
                  target_hours: customHours,
                  is_custom: true,
                });
              }
            }}
            disabled={starting}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            Mulai puasa {customHours} jam
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title="Puasa lebih dari 16 jam"
        description="Puasa panjang tidak disarankan untuk ibu hamil/menyusui, remaja, atau yang punya riwayat gangguan makan, diabetes, atau kondisi medis lain. Pastikan kamu cukup hidrasi & berhenti kapan saja jika tidak nyaman."
        confirmLabel="Saya mengerti, mulai"
        cancelLabel="Batal"
        onConfirm={() => {
          if (pending) {
            const isCustom = pending.protocol.startsWith("custom:");
            onStart({
              protocol: pending.protocol,
              target_hours: pending.target_hours,
              is_custom: isCustom,
            });
          }
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

// ─── Ramadhan Schedule Card ──────────────────────────────────────────────────

export function RamadhanScheduleCard({
  ramadhan,
  setRamadhan,
  imsak,
  setImsak,
  iftar,
  setIftar,
  onSave,
  saving,
}: {
  ramadhan: boolean;
  setRamadhan: (v: boolean) => void;
  imsak: string;
  setImsak: (v: string) => void;
  iftar: string;
  setIftar: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="space-y-3 bg-card p-5 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold">Mode Ramadhan</p>
          <p className="text-xs text-muted-foreground">Jadwal puasa berulang harian</p>
        </div>
        <input
          type="checkbox"
          className="size-5"
          checked={ramadhan}
          onChange={(e) => setRamadhan(e.target.checked)}
        />
      </div>
      {ramadhan && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Imsak</span>
            <input
              type="time"
              value={imsak}
              onChange={(e) => setImsak(e.target.value)}
              className="w-full bg-secondary/40 rounded-lg px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Berbuka</span>
            <input
              type="time"
              value={iftar}
              onChange={(e) => setIftar(e.target.value)}
              className="w-full bg-secondary/40 rounded-lg px-2 py-2 text-sm"
            />
          </label>
        </div>
      )}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
      >
        Simpan jadwal
      </button>
    </section>
  );
}

// ─── Fast History List ───────────────────────────────────────────────────────

export function FastHistoryList({
  history,
}: {
  history: {
    id: string;
    protocol: string;
    start_time: string;
    end_time?: string | null;
    target_hours: number | string;
    completed?: boolean | null;
    is_ramadhan?: boolean | null;
    is_custom?: boolean | null;
    mood_after?: number | null;
  }[];
}) {
  if (history.length === 0) return null;
  return (
    <section className="space-y-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Riwayat
        </h2>
        <span className="text-xs text-muted-foreground">{history.length} sesi</span>
      </div>
      {history.map((h) => {
        const dur = h.end_time
          ? (new Date(h.end_time).getTime() - new Date(h.start_time).getTime()) / 3600000
          : 0;
        const date = new Date(h.start_time).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        });
        const moodEmoji = h.mood_after
          ? ["😴", "😐", "🙂", "😊", "🔥"][Math.min(4, h.mood_after - 1)]
          : null;

        return (
          <div
            key={h.id}
            className="bg-card p-4 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
          >
            <div
              className={`size-9 rounded-xl grid place-items-center ${h.completed ? "bg-mint text-sage-deep" : "bg-muted text-muted-foreground"}`}
            >
              {h.completed ? <Check className="size-4" /> : <X className="size-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {h.protocol} · {date}
                {h.is_ramadhan && " 🌙"}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {dur.toFixed(1)}j / {Number(h.target_hours)}j{moodEmoji ? ` · ${moodEmoji}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
