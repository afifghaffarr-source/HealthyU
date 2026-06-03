import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProgress, addProgress, deleteProgress } from "@/lib/progress.functions";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Camera, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listProgress);
  const add = useServerFn(addProgress);
  const del = useServerFn(deleteProgress);
  const { data: photos = [] } = useQuery({ queryKey: ["progress"], queryFn: () => fetchList() });

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
      const { data: { user } } = await supabase.auth.getUser();
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
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Foto Progres</h1>
            <p className="text-xs text-muted-foreground">Pantau perubahan kamu</p>
          </div>
        </header>

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
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {uploading ? "Mengunggah..." : "Ambil / Pilih Foto"}
          </button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl outline-1 outline-black/5 overflow-hidden relative group">
              {p.signed_url ? (
                <img src={p.signed_url} alt="" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-muted" />
              )}
              <div className="p-2">
                <p className="text-xs font-semibold">
                  {new Date(p.taken_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </p>
                {p.weight_kg && <p className="text-[10px] text-muted-foreground">{p.weight_kg} kg</p>}
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