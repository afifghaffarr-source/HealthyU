import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotifPrefs, updateNotifPrefs } from "@/lib/notifPrefs.functions";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getNotifPrefs);
  const saveFn = useServerFn(updateNotifPrefs);
  const { data: p } = useQuery({ queryKey: ["notif-prefs"], queryFn: () => fetchFn() });

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => saveFn({ data: patch as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-prefs"] });
      toast.success("Tersimpan");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center justify-between py-3 px-4 bg-card rounded-2xl outline-1 outline-black/5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        className="size-5"
        checked={Boolean((p as Record<string, unknown> | undefined)?.[k])}
        onChange={(e) => save.mutate({ [k]: e.target.checked })}
      />
    </label>
  );

  const TimeInput = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center justify-between py-3 px-4 bg-card rounded-2xl outline-1 outline-black/5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="time"
        className="bg-secondary/40 rounded-lg px-2 py-1 text-sm"
        defaultValue={String((p as Record<string, unknown> | undefined)?.[k] ?? "").slice(0, 5)}
        onBlur={(e) => save.mutate({ [k]: e.target.value })}
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Notifikasi" showBack />

        {!p ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (
          <>
            <Section title="Makan">
              <Toggle k="meal_reminder_enabled" label="Aktifkan pengingat makan" />
              <TimeInput k="meal_breakfast_time" label="Sarapan" />
              <TimeInput k="meal_lunch_time" label="Makan siang" />
              <TimeInput k="meal_dinner_time" label="Makan malam" />
            </Section>

            <Section title="Hidrasi">
              <Toggle k="water_reminder_enabled" label="Aktifkan pengingat air" />
              <label className="flex items-center justify-between py-3 px-4 bg-card rounded-2xl outline-1 outline-black/5">
                <span className="text-sm font-medium">Interval (menit)</span>
                <input
                  type="number"
                  min={15}
                  max={360}
                  defaultValue={Number((p as Record<string, unknown>)["water_interval_min"] ?? 90)}
                  onBlur={(e) => save.mutate({ water_interval_min: Number(e.target.value) })}
                  className="bg-secondary/40 rounded-lg px-2 py-1 text-sm w-20 text-right"
                />
              </label>
              <TimeInput k="water_start_time" label="Mulai" />
              <TimeInput k="water_end_time" label="Selesai" />
            </Section>

            <Section title="Olahraga & Puasa">
              <Toggle k="exercise_reminder_enabled" label="Pengingat olahraga" />
              <TimeInput k="exercise_time" label="Jam olahraga" />
              <Toggle k="fasting_sahur_enabled" label="Pengingat sahur" />
              <Toggle k="fasting_iftar_enabled" label="Pengingat berbuka" />
            </Section>

            <Section title="Sholat">
              <Toggle k="prayer_reminder_enabled" label="Aktifkan adzan" />
              <label className="flex items-center justify-between py-3 px-4 bg-card rounded-2xl outline-1 outline-black/5">
                <span className="text-sm font-medium">Menit sebelumnya</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  defaultValue={Number(
                    (p as Record<string, unknown>)["prayer_minutes_before"] ?? 10,
                  )}
                  onBlur={(e) => save.mutate({ prayer_minutes_before: Number(e.target.value) })}
                  className="bg-secondary/40 rounded-lg px-2 py-1 text-sm w-20 text-right"
                />
              </label>
            </Section>

            <Section title="Lainnya">
              <Toggle k="health_alert_enabled" label="Alert kesehatan" />
              <Toggle k="weekly_report_enabled" label="Laporan mingguan" />
              <Toggle k="social_enabled" label="Sosial & komunitas" />
              <Toggle k="achievement_enabled" label="Pencapaian" />
              <Toggle k="challenge_enabled" label="Tantangan" />
              <Toggle k="system_enabled" label="Sistem" />
              <Toggle k="marketing_enabled" label="Promo & marketing" />
            </Section>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 animate-fade-up">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
