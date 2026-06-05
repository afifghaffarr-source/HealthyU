import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProgress, addProgress, deleteProgress } from "@/lib/progress.functions";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { Camera, Trash2, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import { generateTimelapse } from "@/lib/timelapse";
import { lazy, Suspense } from "react";

const ProgressRadialChart = lazy(
  () => import("@/components/charts/progress-radial-chart"),
);
import { getProfile } from "@/lib/profile.functions";
import { todaysMeals } from "@/lib/meals.functions";
import { todaysWater } from "@/lib/water.functions";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listProgress);
  const add = useServerFn(addProgress);
  const del = useServerFn(deleteProgress);
  const { data: photos = [] } = useQuery({ queryKey: ["progress"], queryFn: () => fetchList() });
  const fetchProfile = useServerFn(getProfile);
  const fetchMeals = useServerFn(todaysMeals);
  const fetchWater = useServerFn(todaysWater);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: meals = [] } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: () => fetchMeals(),
  });
  const { data: waterMl = 0 } = useQuery({
    queryKey: ["water", "today"],
    queryFn: () => fetchWater(),
  });
  const cal = meals.reduce((a, m) => a + Number(m.calories || 0), 0);
  const calTarget = profile?.daily_calorie_target ?? 2000;
  const waterTarget = 2500;
  const goalData = [
    { name: "Kalori", value: Math.min(100, (cal / calTarget) * 100), fill: "hsl(var(--primary))" },
    { name: "Air", value: Math.min(100, (waterMl / waterTarget) * 100), fill: "#0ea5e9" },
    { name: "Foto", value: photos.length > 0 ? 100 : 0, fill: "#f97316" },
  ];

  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const delMut = useMutation({
    mutationFn: (v: { id: string; photo_url: string }) => del({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak login");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      await add({
        data: {
          photo_url: path,
          weight_kg: weight ? Number(weight) : undefined,
          notes: notes || undefined,
        },
      });
      setWeight("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["progress"] });
      toast.success("Foto progres tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Foto Progres" subtitle="Pantau perubahan kamu" showBack />

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Goal Harian
          </p>
          <div className="h-44">
            <Suspense
              fallback={<div className="size-full animate-pulse rounded-lg bg-muted" />}
            >
              <ProgressRadialChart data={goalData} />
            </Suspense>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1">
            {goalData.map((g) => (
              <div key={g.name}>
                <div className="size-2 rounded-full mx-auto mb-1" style={{ background: g.fill }} />
                <p className="font-semibold">{g.name}</p>
                <p className="text-muted-foreground tabular-nums">{Math.round(g.value)}%</p>
              </div>
            ))}
          </div>
        </section>

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
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {uploading ? "Mengunggah..." : "Ambil / Pilih Foto"}
          </button>
        </section>

        {photos.length >= 2 && (
          <TimelapseButton
            photos={photos
              .filter((p): p is typeof p & { signed_url: string } => Boolean(p.signed_url))
              .map((p) => ({ url: p.signed_url!, taken_at: p.taken_at }))}
          />
        )}

        <section className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="bg-card rounded-2xl outline-1 outline-black/5 overflow-hidden relative group"
            >
              {p.signed_url ? (
                <img loading="lazy" decoding="async" src={p.signed_url} alt="" className="w-full aspect-square object-cover" />
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
                {p.weight_kg && (
                  <p className="text-[10px] text-muted-foreground">{p.weight_kg} kg</p>
                )}
                {p.notes && <p className="text-[10px] text-muted-foreground truncate">{p.notes}</p>}
              </div>
              <button
                onClick={() => delMut.mutate({ id: p.id, photo_url: p.photo_url })}
                className="absolute top-1.5 right-1.5 size-7 bg-black/60 text-white rounded-full grid place-items-center"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </section>
        {photos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Belum ada foto progres</p>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function TimelapseButton({ photos }: { photos: { url: string; taken_at: string }[] }) {
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
      toast.error(e instanceof Error ? e.message : "Gagal membuat time-lapse");
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
