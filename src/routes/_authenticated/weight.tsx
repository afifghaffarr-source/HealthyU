import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWeight, addWeight, deleteWeight } from "@/lib/weight.functions";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SyncPill } from "@/components/healthyu/sync-pill";
import { toast } from "sonner";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/weight")({
  component: WeightPage,
});

function WeightPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listWeight);
  const fetchProfile = useServerFn(getProfile);
  const add = useServerFn(addWeight);
  const del = useServerFn(deleteWeight);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["weight"], queryFn: () => fetchList() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [val, setVal] = useState("");
  const [note, setNote] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const payload = { weight_kg: Number(val), note: note.trim() || undefined };
      if (!navigator.onLine) {
        await enqueue("weight", payload);
        return { offline: true as const };
      }
      return add({ data: payload });
    },
    onSuccess: (res) => {
      setVal("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["weight"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (res && "offline" in res && res.offline) {
        toast.success("Berat disimpan offline. Akan sync otomatis.");
      } else {
        toast.success("Berat tercatat");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });

  const target = profile?.target_weight_kg ? Number(profile.target_weight_kg) : null;
  const current = logs[0] ? Number(logs[0].weight_kg) : (profile?.weight_kg ? Number(profile.weight_kg) : null);
  const first = logs[logs.length - 1] ? Number(logs[logs.length - 1].weight_kg) : null;
  const delta = current != null && first != null ? current - first : 0;

  const max = Math.max(...logs.map((l) => Number(l.weight_kg)), current ?? 0, target ?? 0) || 1;
  const min = Math.min(...logs.map((l) => Number(l.weight_kg)), current ?? max, target ?? max) || 0;
  const range = Math.max(max - min, 1);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar
          title="Berat Badan"
          showBack
          action={<SyncPill online={online} pending={pending} onSync={() => sync()} />}
        />
      </div>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        <section className="bg-card rounded-3xl p-5 shadow-sm outline-1 outline-black/5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Sekarang</p>
              <p className="text-3xl font-bold tabular-nums">
                {current != null ? current.toFixed(1) : "—"}<span className="text-base text-muted-foreground ml-1">kg</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Target</p>
              <p className="text-xl font-bold tabular-nums">{target != null ? target.toFixed(1) : "—"} kg</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-sm font-semibold">
            {delta < 0 ? <TrendingDown className="size-4 text-emerald-600" /> : delta > 0 ? <TrendingUp className="size-4 text-rose-600" /> : <Minus className="size-4 text-muted-foreground" />}
            <span className={delta < 0 ? "text-emerald-600" : delta > 0 ? "text-rose-600" : "text-muted-foreground"}>
              {delta === 0 ? "Tidak berubah" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg sejak awal`}
            </span>
          </div>
        </section>

        <section className="bg-card rounded-3xl p-5 shadow-sm outline-1 outline-black/5">
          <p className="font-bold text-sm mb-3">Catat berat hari ini</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="kg"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="flex-1 bg-background border rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={() => addMut.mutate()}
              disabled={!val || addMut.isPending}
              className="bg-primary text-primary-foreground font-semibold px-4 rounded-xl text-sm disabled:opacity-50"
            >
              Simpan
            </button>
          </div>
          <input
            type="text"
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="w-full mt-2 bg-background border rounded-xl px-3 py-2 text-sm"
          />
        </section>

        {logs.length > 1 && (
          <section className="bg-card rounded-3xl p-5 shadow-sm outline-1 outline-black/5">
            <p className="font-bold text-sm mb-3">Tren ({logs.length} catatan)</p>
            <div className="h-32 flex items-end gap-1">
              {[...logs].reverse().map((l) => {
                const h = ((Number(l.weight_kg) - min) / range) * 100;
                return (
                  <div key={l.id} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{min.toFixed(1)} kg</span>
              <span>{max.toFixed(1)} kg</span>
            </div>
          </section>
        )}

        <section className="bg-card rounded-3xl p-5 shadow-sm outline-1 outline-black/5">
          <p className="font-bold text-sm mb-3">Riwayat</p>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada catatan</p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="font-semibold tabular-nums">{Number(l.weight_kg).toFixed(1)} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.logged_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {l.note ? ` · ${l.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => delMut.mutate(l.id)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}