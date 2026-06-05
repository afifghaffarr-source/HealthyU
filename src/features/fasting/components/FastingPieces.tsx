import { useState } from "react";
import { Check, X } from "lucide-react";
import { ConfirmDialog } from "@/components/healthyu/confirm-dialog";
import { FASTING_PROTOCOLS, fastingStage, formatDuration } from "@/lib/health";

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
        <p className="text-5xl font-bold tabular-nums mb-2">{formatDuration(elapsedMs)}</p>
        <p className="text-sm text-white/80 mb-6">Target: {Number(fast.target_hours)} jam</p>
        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-coral transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm font-medium mb-6">{fastingStage(elapsedHrs)}</p>
        <button
          onClick={() => onStop(fast.id)}
          disabled={stopping}
          className="w-full bg-white text-sage-deep font-bold py-3.5 rounded-2xl"
        >
          Hentikan puasa
        </button>
      </div>
    </section>
  );
}

export function ProtocolPicker({
  onStart,
  starting,
}: {
  onStart: (p: { protocol: string; target_hours: number }) => void;
  starting: boolean;
}) {
  const [pending, setPending] = useState<{ protocol: string; target_hours: number } | null>(null);
  const handlePick = (p: { protocol: string; target_hours: number }) => {
    if (p.target_hours > 16) {
      setPending(p);
      return;
    }
    onStart(p);
  };
  return (
    <section className="space-y-3 animate-fade-up">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Pilih protokol
      </h2>
      {FASTING_PROTOCOLS.map((p) => (
        <button
          key={p.id}
          onClick={() => handlePick({ protocol: p.id, target_hours: p.fast })}
          disabled={starting}
          className="w-full bg-card p-5 rounded-3xl outline-1 outline-black/5 text-left hover:bg-secondary/40 transition flex items-center justify-between"
        >
          <div>
            <p className="font-bold">{p.label}</p>
            <p className="text-xs text-muted-foreground">
              {p.fast}j puasa · {p.eat}j makan
            </p>
          </div>
          <span className="text-primary font-bold text-sm">Mulai →</span>
        </button>
      ))}
      <ConfirmDialog
        open={!!pending}
        title="Puasa lebih dari 16 jam"
        description="Puasa panjang tidak disarankan untuk ibu hamil/menyusui, remaja, atau yang punya riwayat gangguan makan, diabetes, atau kondisi medis lain. Pastikan kamu cukup hidrasi & berhenti kapan saja jika tidak nyaman."
        confirmLabel="Saya mengerti, mulai"
        cancelLabel="Batal"
        onConfirm={() => {
          if (pending) onStart(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

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
  }[];
}) {
  if (history.length === 0) return null;
  return (
    <section className="space-y-2 animate-fade-up">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Riwayat</h2>
      {history.map((h) => {
        const dur = h.end_time
          ? (new Date(h.end_time).getTime() - new Date(h.start_time).getTime()) / 3600000
          : 0;
        const date = new Date(h.start_time).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        });
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
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {dur.toFixed(1)}j / {Number(h.target_hours)}j
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}