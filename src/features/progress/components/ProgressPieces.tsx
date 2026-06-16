import { Camera, Film, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { generateTimelapse } from "@/lib/timelapse";
import { ClientChart } from "@/components/ClientChart";

type GoalDatum = { name: string; value: number; fill: string };

export function GoalRadialCard({ data }: { data: GoalDatum[] }) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Goal Harian
      </p>
      <div className="h-44">
        <ClientChart
          loader={() =>
            import("@/components/charts/progress-radial-chart").then((m) => ({
              Component: m.default,
            }))
          }
          props={{ data }}
          fallback={<div className="size-full animate-pulse rounded-lg bg-muted" />}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1">
        {data.map((g) => (
          <div key={g.name}>
            <div className="size-2 rounded-full mx-auto mb-1" style={{ background: g.fill }} />
            <p className="font-semibold">{g.name}</p>
            <p className="text-muted-foreground tabular-nums">{Math.round(g.value)}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UploadProgressCard({
  weight,
  setWeight,
  notes,
  setNotes,
  uploading,
  onPickFile,
}: {
  weight: string;
  setWeight: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  uploading: boolean;
  onPickFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          <span className="text-muted-foreground">Berat (kg)</span>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="opsional"
            className="w-full bg-background rounded-xl px-3 py-2 mt-1 outline-1 outline-black/10"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Catatan</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="opsional"
            className="w-full bg-background rounded-xl px-3 py-2 mt-1 outline-1 outline-black/10"
          />
        </label>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickFile(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {uploading ? "Mengunggah..." : "Ambil / Pilih Foto"}
      </button>
    </section>
  );
}

type PhotoItem = {
  id: string;
  signed_url?: string | null;
  photo_url: string;
  taken_at: string;
  weight_kg?: number | null;
  notes?: string | null;
};

export function ProgressPhotoGrid({
  photos,
  onDelete,
}: {
  photos: PhotoItem[];
  onDelete: (id: string, photo_url: string) => void;
}) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {photos.map((p) => (
        <div
          key={p.id}
          className="bg-card rounded-2xl outline-1 outline-black/5 overflow-hidden relative group"
        >
          {p.signed_url ? (
            <img
              loading="lazy"
              decoding="async"
              src={p.signed_url}
              alt=""
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-muted" />
          )}
          <div className="p-2">
            <p className="text-xs font-semibold">
              {new Date(p.taken_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </p>
            {p.weight_kg && <p className="text-[10px] text-muted-foreground">{p.weight_kg} kg</p>}
            {p.notes && <p className="text-[10px] text-muted-foreground truncate">{p.notes}</p>}
          </div>
          <button
            onClick={() => onDelete(p.id, p.photo_url)}
            className="absolute top-1.5 right-1.5 size-7 bg-black/60 text-white rounded-full grid place-items-center"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </section>
  );
}

export function TimelapseButton({ photos }: { photos: { url: string; taken_at: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setVideo(null);
    try {
      const r = await generateTimelapse(photos, { frameMs: 600 });
      setVideo({ url: r.url, ext: r.ext });
      toast.success("Time-lapse siap!");
    } catch (e) {
      toastError(e, "Gagal membuat time-lapse");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
      <div className="flex items-center gap-2">
        <Film className="size-4 text-coral" />
        <h2 className="font-semibold text-sm">Time-lapse Transformasi</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Gabungkan {photos.length} foto progres jadi video pendek.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="w-full bg-coral text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
        {busy ? "Merender..." : "Buat Time-lapse"}
      </button>
      {video && (
        <div className="space-y-2">
          <video src={video.url} controls autoPlay loop className="w-full rounded-2xl" />
          <a
            href={video.url}
            download={`timelapse-${Date.now()}.${video.ext}`}
            className="block w-full text-center bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl text-sm"
          >
            Unduh video
          </a>
        </div>
      )}
    </section>
  );
}
