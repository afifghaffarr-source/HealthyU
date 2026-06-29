import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMood, addMood, deleteMood } from "@/features/mood/lib/mood.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Smile } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SyncPill } from "@/components/healthyu/sync-pill";
import { EmptyState } from "@/components/healthyu/empty-state";
import { toast } from "@/lib/toast-config";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import {
  MoodTrendCard,
  MoodComposer,
  MoodHistoryItem,
} from "@/features/mood/components/MoodPieces";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mood")({
  component: MoodPage,
});

function MoodPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchList = useServerFn(listMood);
  const add = useServerFn(addMood);
  const del = useServerFn(deleteMood);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["mood"], queryFn: () => fetchList() });

  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const payload = { mood: mood!, note: note.trim() || undefined };
      if (!navigator.onLine) {
        await enqueue("mood", payload).catch(() => {});
        return { offline: true as const };
      }
      return add({ data: payload });
    },
    onSuccess: (res) => {
      setMood(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success(
        res && "offline" in res && res.offline ? t("mood.offlineSaved") : t("mood.logged"),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success(t("common.deleted"));
    },
  });

  const avg =
    logs.length === 0 ? null : logs.reduce((a, l) => a + (l.mood as number), 0) / logs.length;

  const last14 = useMemo(() => {
    const days: { d: string; label: string; v: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      const todays = logs.filter((l) => (l.logged_at as string).slice(0, 10) === key);
      const v = todays.length
        ? todays.reduce((a, l) => a + (l.mood as number), 0) / todays.length
        : null;
      days.push({ d: key, label: String(dt.getDate()), v });
    }
    return days;
  }, [logs]);
  const trendAvg = useMemo(() => {
    const valid = last14.filter((d) => d.v != null) as { v: number }[];
    return valid.length ? valid.reduce((a, x) => a + x.v, 0) / valid.length : null;
  }, [last14]);

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar
          title={t("mood.title")}
          subtitle={avg ? t("mood.avgLabel", { avg: avg.toFixed(1) }) : t("mood.subtitle")}
          showBack
          action={<SyncPill online={online} pending={pending} onSync={() => sync()} />}
        />
      </div>

      <main className="max-w-md mx-auto px-4 space-y-6">
        {logs.length > 0 && <MoodTrendCard last14={last14} trendAvg={trendAvg} />}

        <MoodComposer
          mood={mood}
          setMood={setMood}
          note={note}
          setNote={setNote}
          onSave={() => addMut.mutate()}
          saving={addMut.isPending}
        />

        <section>
          <h2 className="text-sm font-semibold mb-3">{t("common.history")}</h2>
          {logs.length === 0 ? (
            <div className="rounded-2xl bg-card outline-1 outline-black/5">
              <EmptyState icon={Smile} title={t("mood.empty")} description={t("mood.emptyHint")} />
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <MoodHistoryItem
                  key={l.id as string}
                  log={{
                    id: l.id as string,
                    mood: l.mood as number,
                    logged_at: l.logged_at as string,
                    note: l.note as string | null | undefined,
                  }}
                  onDelete={(id) => delMut.mutate(id)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
