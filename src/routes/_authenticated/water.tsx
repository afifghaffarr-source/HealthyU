import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  todaysWater,
  todaysWaterEntries,
  weekWaterHistory,
  logWater,
  deleteWater,
} from "@/lib/water.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Droplet, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/water")({
  component: WaterPage,
});

const GOAL_ML = 2500;
const QUICK = [200, 250, 350, 500];

function WaterPage() {
  const qc = useQueryClient();
  const fetchToday = useServerFn(todaysWater);
  const fetchEntries = useServerFn(todaysWaterEntries);
  const fetchWeek = useServerFn(weekWaterHistory);
  const logFn = useServerFn(logWater);
  const delFn = useServerFn(deleteWater);

  const { data: total = 0 } = useQuery({ queryKey: ["water", "today"], queryFn: () => fetchToday() });
  const { data: entries = [] } = useQuery({
    queryKey: ["water", "entries"],
    queryFn: () => fetchEntries(),
  });
  const { data: week = [] } = useQuery({
    queryKey: ["water", "week"],
    queryFn: () => fetchWeek(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["water"] });
    qc.invalidateQueries({ queryKey: ["game", "summary"] });
  };

  const logMut = useMutation({
    mutationFn: (ml: number) => logFn({ data: { amount_ml: ml } }),
    onSuccess: (res, ml) => {
      invalidate();
      toast.success(`+${ml}ml dicatat`);
      const newly = res?.game?.newlyUnlocked ?? [];
      newly.forEach((a: { icon: string; title: string }) =>
        toast.success(`${a.icon} ${a.title} terbuka!`),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Dihapus");
    },
  });

  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100));
  const maxWeek = Math.max(GOAL_ML, ...week.map((d) => d.total_ml));

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="size-10 rounded-2xl bg-card flex items-center justify-center"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Hidrasi</h1>
            <p className="text-xs text-muted-foreground">Target {GOAL_ML} ml / hari</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-6">
        <section className="rounded-3xl bg-card p-6 outline-1 outline-black/5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Hari ini</p>
              <p className="text-4xl font-bold">
                {total}
                <span className="text-base text-muted-foreground ml-1">ml</span>
              </p>
            </div>
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Droplet className="size-7 text-primary" />
            </div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{pct}% dari target</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Tambah cepat</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((ml) => (
              <button
                key={ml}
                disabled={logMut.isPending}
                onClick={() => logMut.mutate(ml)}
                className="rounded-2xl bg-card outline-1 outline-black/5 p-3 flex flex-col items-center gap-1 active:scale-95 transition disabled:opacity-50"
              >
                <Droplet className="size-5 text-primary" />
                <span className="text-sm font-semibold">{ml}</span>
                <span className="text-[10px] text-muted-foreground">ml</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">7 hari terakhir</h2>
          <div className="rounded-3xl bg-card p-4 outline-1 outline-black/5">
            <div className="flex items-end justify-between gap-2 h-32">
              {week.map((d) => {
                const h = Math.max(4, Math.round((d.total_ml / maxWeek) * 100));
                const day = new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" });
                const reached = d.total_ml >= GOAL_ML;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-medium text-muted-foreground">
                      {Math.round(d.total_ml / 100) / 10}L
                    </div>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg ${reached ? "bg-primary" : "bg-primary/40"}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Catatan hari ini</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl bg-card p-4 outline-1 outline-black/5">
              Belum ada catatan. Tekan tombol di atas untuk menambah.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl bg-card p-3 outline-1 outline-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Droplet className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{e.amount_ml} ml</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(e.logged_at as string).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => delMut.mutate(e.id as string)}
                    className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition"
                    aria-label="Hapus"
                  >
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