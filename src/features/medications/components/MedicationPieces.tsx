import { Check, Clock, Pill, Plus, Trash2, X } from "lucide-react";

type Med = {
  id: string;
  name: string;
  dose?: string | null;
  times?: string[] | null;
};

export function TodayMedSummary({
  doneSlots,
  totalSlots,
  pct,
  next,
}: {
  doneSlots: number;
  totalSlots: number;
  pct: number;
  next: { med: Med; time: string } | null;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 text-white p-5 outline-1 outline-black/5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
          <Pill className="size-3" /> Hari ini
        </div>
        <span className="text-xs font-bold tabular-nums">
          {doneSlots}/{totalSlots} dosis
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black leading-none tabular-nums">{pct}</span>
        <span className="pb-1 text-sm opacity-80">%</span>
      </div>
      <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
      {next && (
        <p className="mt-3 text-xs opacity-90 inline-flex items-center gap-1">
          <Clock className="size-3" /> Berikutnya: <b className="font-semibold">{next.med.name}</b>{" "}
          · {next.time}
        </p>
      )}
    </section>
  );
}

export function MedicationCard({
  m,
  isTaken,
  onMark,
  onDelete,
}: {
  m: Med;
  isTaken: (time: string) => boolean;
  onMark: (time: string) => void;
  onDelete: () => void;
}) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-11 rounded-2xl bg-pink-100 grid place-items-center">
          <Pill className="size-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{m.name}</p>
          {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(m.times ?? []).map((t) => {
          const taken = isTaken(t);
          return (
            <button
              key={t}
              onClick={() => !taken && onMark(t)}
              disabled={taken}
              className={`px-3 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                taken ? "bg-mint text-sage-deep" : "bg-background outline-1 outline-black/10"
              }`}
            >
              {taken && <Check className="size-3.5" />} {t}
            </button>
          );
        })}
        {(m.times ?? []).length === 0 && (
          <span className="text-xs text-muted-foreground">Tidak terjadwal</span>
        )}
      </div>
    </section>
  );
}

export function AddMedicationDialog({
  name,
  setName,
  dose,
  setDose,
  times,
  setTimes,
  onClose,
  onSubmit,
  submitting,
}: {
  name: string;
  setName: (v: string) => void;
  dose: string;
  setDose: (v: string) => void;
  times: string[];
  setTimes: (v: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Tambah obat / vitamin</h3>
          <button onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama (mis. Vitamin D)"
          className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm"
        />
        <input
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="Dosis (mis. 1000 IU)"
          className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm"
        />
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Jadwal</p>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1 bg-card outline-1 outline-black/10 rounded-2xl px-2 py-1"
              >
                <input
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const copy = [...times];
                    copy[i] = e.target.value;
                    setTimes(copy);
                  }}
                  className="bg-transparent text-sm"
                />
                <button onClick={() => setTimes(times.filter((_, idx) => idx !== i))}>
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setTimes([...times, "12:00"])}
              className="px-3 py-1.5 rounded-2xl bg-mint text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="size-3" /> Jam
            </button>
          </div>
        </div>
        <button
          onClick={() => name.trim() && onSubmit()}
          disabled={!name.trim() || submitting}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
