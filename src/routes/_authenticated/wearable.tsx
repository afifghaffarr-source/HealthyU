import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Activity, RefreshCw, Plug, Unplug, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import {
  startGoogleFit,
  getWearableStatus,
  syncGoogleFit,
  disconnectGoogleFit,
} from "@/lib/google-fit.functions";

export const Route = createFileRoute("/_authenticated/wearable")({
  component: WearablePage,
});

function WearablePage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getWearableStatus);
  const startFn = useServerFn(startGoogleFit);
  const syncFn = useServerFn(syncGoogleFit);
  const disconnectFn = useServerFn(disconnectGoogleFit);

  const { data, isLoading } = useQuery({ queryKey: ["wearable"], queryFn: () => statusFn() });

  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("connected")) {
      toast.success("Google Fit terhubung!");
      u.searchParams.delete("connected");
      window.history.replaceState({}, "", u.toString());
      qc.invalidateQueries({ queryKey: ["wearable"] });
    }
    const err = u.searchParams.get("error");
    if (err) {
      toast.error(err);
      u.searchParams.delete("error");
      window.history.replaceState({}, "", u.toString());
    }
  }, [qc]);

  const connectMut = useMutation({
    mutationFn: () => startFn({ data: { origin: window.location.origin } }),
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mulai OAuth"),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r) => {
      toast.success(`Sinkron OK — ${r.steps_days} hari langkah, ${r.heart_rate_days} hari HR`);
      qc.invalidateQueries({ queryKey: ["wearable"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal sinkron"),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Google Fit diputus");
      qc.invalidateQueries({ queryKey: ["wearable"] });
    },
  });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link
            to="/profile"
            className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Wearable</h1>
            <p className="text-xs text-muted-foreground">Sinkron data Google Fit</p>
          </div>
        </header>

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center">
              <Activity className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Google Fit</p>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Memuat..."
                  : data?.connected
                    ? `Terhubung${data.last_sync_at ? " · " + new Date(data.last_sync_at).toLocaleString("id-ID") : ""}`
                    : "Belum terhubung"}
              </p>
            </div>
          </div>

          {!data?.connected ? (
            <button
              onClick={() => connectMut.mutate()}
              disabled={connectMut.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
            >
              {connectMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plug className="size-4" />
              )}
              Hubungkan Google Fit
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => syncMut.mutate()}
                disabled={syncMut.isPending}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
              >
                {syncMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sinkron sekarang
              </button>
              <button
                onClick={() => disconnectMut.mutate()}
                className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl"
              >
                <Unplug className="size-4" /> Putus
              </button>
            </div>
          )}
        </section>

        {data?.connected && data.recent_steps && data.recent_steps.length > 0 && (
          <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Langkah 7 hari
            </p>
            <ul className="space-y-2">
              {data.recent_steps.map((s) => (
                <li key={s.day} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(s.day).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="font-bold tabular-nums">{s.steps.toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Data yang disinkron: jumlah langkah harian, rata-rata detak jantung harian
          (tersimpan ke catatan vital). Pastikan aplikasi Google Fit di HP kamu aktif.
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
