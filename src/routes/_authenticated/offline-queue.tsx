import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useState, useCallback } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-config";
import {
  listDead,
  removeDead,
  retryDead,
  clearDead,
  listAll,
  type QueueItem,
} from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/offline-queue")({
  component: OfflineQueuePage,
});

const KIND_LABEL: Record<string, string> = {
  water: "Hidrasi",
  weight: "Berat",
  meal: "Makanan",
  mood: "Mood",
  vitals: "Vitals",
  workout: "Latihan",
};

function OfflineQueuePage() {
  const { online, pending, sync } = useOfflineQueue();
  const [dead, setDead] = useState<QueueItem[]>([]);
  const [queued, setQueued] = useState<QueueItem[]>([]);

  const refresh = useCallback(async () => {
    setDead(await listDead());
    setQueued(await listAll());
  }, []);

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("offline-queue:changed", h);
    return () => window.removeEventListener("offline-queue:changed", h);
  }, [refresh]);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Antrean Offline" subtitle="· menunggu · gagal" showBack />

        {pending > 0 && (
          <button
            onClick={() => sync()}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-4" /> Sync sekarang ({pending})
          </button>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold px-1">Menunggu sync</h2>
          {queued.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card p-4 rounded-2xl outline-1 outline-black/5">
              Tidak ada item pending.
            </p>
          ) : (
            queued.map((it) => (
              <div
                key={it.id}
                className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{KIND_LABEL[it.kind] ?? it.kind}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(it.created_at).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {it.attempts ? ` · percobaan ${it.attempts}` : ""}
                  </p>
                  {it.last_error && (
                    <p className="text-[11px] text-amber-700 truncate">{it.last_error}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold inline-flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-600" /> Gagal sync
            </h2>
            {dead.length > 0 && (
              <button
                onClick={async () => {
                  await clearDead();
                  toast.success("Dibersihkan");
                  refresh();
                }}
                className="text-[11px] font-semibold text-destructive"
              >
                Hapus semua
              </button>
            )}
          </div>
          {dead.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card p-4 rounded-2xl outline-1 outline-black/5">
              Tidak ada item gagal.
            </p>
          ) : (
            dead.map((it) => (
              <div
                key={it.id}
                className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{KIND_LABEL[it.kind] ?? it.kind}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(it.failed_at ?? it.created_at).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                  {it.last_error && (
                    <p className="text-[11px] text-destructive truncate">{it.last_error}</p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (it.id == null) return;
                    await retryDead(it.id);
                    toast.success("Dikirim ulang ke antrean");
                    refresh();
                  }}
                  className="size-9 grid place-items-center rounded-xl bg-primary/10 text-primary"
                  aria-label="Coba lagi"
                >
                  <RefreshCw className="size-4" />
                </button>
                <button
                  onClick={async () => {
                    if (it.id == null) return;
                    await removeDead(it.id);
                    refresh();
                  }}
                  className="size-9 grid place-items-center rounded-xl text-muted-foreground hover:text-destructive"
                  aria-label="Hapus"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
