import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { PushNotifications } from "@/components/push-notifications";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import {
  Bell,
  BellOff,
  Droplet,
  Utensils,
  Dumbbell,
  Moon,
  Pill,
  Timer,
  Sparkles,
  Plus,
  Trash2,
  MoonStar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  DEFAULT_REMINDERS,
  loadReminders,
  saveReminders,
  type Reminder,
  type ReminderCategory,
} from "@/lib/reminders-store";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: RemindersPage,
});

const CATEGORY_META: Record<ReminderCategory, { icon: typeof Bell; label: string }> = {
  water: { icon: Droplet, label: "Air" },
  meal: { icon: Utensils, label: "Makan" },
  workout: { icon: Dumbbell, label: "Olahraga" },
  sleep: { icon: Moon, label: "Tidur" },
  medication: { icon: Pill, label: "Obat" },
  fasting: { icon: Timer, label: "Puasa" },
  prayer: { icon: MoonStar, label: "Sholat" },
  custom: { icon: Sparkles, label: "Lain" },
};

const DAY_LABELS = ["M", "S", "S", "R", "K", "J", "S"];

function RemindersPage() {
  const [items, setItems] = useState<Reminder[]>(DEFAULT_REMINDERS);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newCategory, setNewCategory] = useState<ReminderCategory>("custom");

  const activeCount = items.filter((i) => i.enabled).length;
  const next = useMemo(() => {
    const now = new Date();
    const today = now.getDay();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const enabled = items.filter(
      (i) => i.enabled && (i.days.length === 0 || i.days.includes(today)),
    );
    const upcoming = enabled
      .map((i) => {
        const [h, m] = i.time.split(":").map(Number);
        return { ...i, min: h * 60 + m };
      })
      .filter((i) => i.min >= nowMin)
      .sort((a, b) => a.min - b.min);
    return upcoming[0] ?? null;
  }, [items]);

  const fmtCountdown = (min: number) => {
    const now = new Date();
    const diff = min - (now.getHours() * 60 + now.getMinutes());
    if (diff <= 0) return "segera";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`;
  };

  useEffect(() => {
    setItems(loadReminders());
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    saveReminders(items);
  }, [items]);

  // The global ReminderScheduler (mounted in __root) handles firing notifications app-wide.

  const requestPerm = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      toast.success("Notifikasi diaktifkan");
      try {
        new Notification("HealthyU", { body: "Pengingat siap dikirim 🔔", icon: "/icon-192.svg" });
      } catch {
        /* ignore */
      }
    } else toast.error("Izin notifikasi ditolak");
  };

  const toggle = (id: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));

  const updateTime = (id: string, time: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, time } : i)));

  const updateLabel = (id: string, label: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, label } : i)));

  const toggleDay = (id: string, day: number) =>
    setItems((arr) =>
      arr.map((i) => {
        if (i.id !== id) return i;
        const has = i.days.includes(day);
        return { ...i, days: has ? i.days.filter((d) => d !== day) : [...i.days, day].sort() };
      }),
    );

  const removeItem = (id: string) => setItems((arr) => arr.filter((i) => i.id !== id));

  const addItem = () => {
    if (!newLabel.trim()) {
      toast.error("Isi nama pengingat");
      return;
    }
    const id = `custom-${Date.now()}`;
    setItems((arr) => [
      ...arr,
      { id, label: newLabel.trim(), time: newTime, enabled: true, category: newCategory, days: [] },
    ]);
    setNewLabel("");
    setNewTime("09:00");
    setNewCategory("custom");
    setShowAdd(false);
    toast.success("Pengingat ditambahkan");
  };

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Pengingat Cerdas"
          showBack
          action={
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="size-10 bg-primary text-primary-foreground rounded-2xl grid place-items-center"
              aria-label="Tambah pengingat"
            >
              <Plus className="size-4" />
            </button>
          }
        />

        <PushNotifications />

        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white animate-fade-up"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.62 0.16 195) 0%, oklch(0.58 0.18 250) 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-80">Pengingat aktif</div>
              <div className="text-3xl font-bold mt-1">
                {activeCount}
                <span className="text-base font-medium opacity-80">/{items.length}</span>
              </div>
            </div>
            <div className="size-12 rounded-2xl bg-white/15 grid place-items-center">
              <Bell className="size-5" />
            </div>
          </div>
          {next ? (
            <div className="mt-4 bg-white/15 rounded-2xl p-3 flex items-center gap-3">
              {(() => {
                const Icon = (CATEGORY_META[next.category] ?? CATEGORY_META.custom).icon;
                return (
                  <div className="size-9 rounded-xl bg-white/20 grid place-items-center">
                    <Icon className="size-4" />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] opacity-80">Berikutnya</div>
                <div className="text-sm font-semibold truncate">
                  {next.label} · {next.time}
                </div>
              </div>
              <div className="text-xs font-medium opacity-90">{fmtCountdown(next.min)}</div>
            </div>
          ) : (
            <div className="mt-4 text-xs opacity-80">Tidak ada pengingat tersisa hari ini</div>
          )}
        </section>

        {permission !== "granted" ? (
          <button
            onClick={requestPerm}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-4 rounded-2xl animate-fade-up"
          >
            <Bell className="size-4" /> Aktifkan notifikasi
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 bg-mint text-sage-deep font-semibold py-3 rounded-2xl text-sm animate-fade-up">
            <Bell className="size-4" /> Notifikasi aktif
          </div>
        )}

        <p className="text-xs text-muted-foreground px-1">
          Pengingat berjalan saat aplikasi terbuka. Install sebagai PWA agar tetap aktif di latar
          belakang.
        </p>

        {showAdd ? (
          <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3 animate-fade-up">
            <input
              type="text"
              placeholder="Nama pengingat"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ReminderCategory)}
                className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-muted text-foreground font-semibold py-2.5 rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                onClick={addItem}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm"
              >
                Simpan
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2 animate-fade-up">
          {items.map((it) => {
            const Meta = CATEGORY_META[it.category] ?? CATEGORY_META.custom;
            const Icon = it.enabled ? Meta.icon : BellOff;
            return (
              <div
                key={it.id}
                className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-xl grid place-items-center ${it.enabled ? "bg-mint" : "bg-muted"}`}
                  >
                    <Icon
                      className={`size-4 ${it.enabled ? "text-sage-deep" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      value={it.label}
                      onChange={(e) => updateLabel(it.id, e.target.value)}
                      className="font-semibold text-sm bg-transparent outline-none w-full"
                      aria-label="Nama pengingat"
                    />
                    <input
                      type="time"
                      value={it.time}
                      onChange={(e) => updateTime(it.id, e.target.value)}
                      className="text-xs text-muted-foreground bg-transparent outline-none mt-0.5"
                    />
                  </div>
                  <button
                    onClick={() => toggle(it.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${it.enabled ? "bg-primary" : "bg-muted"}`}
                    aria-label="Toggle"
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${it.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="size-8 grid place-items-center text-muted-foreground hover:text-destructive"
                    aria-label="Hapus"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pl-13">
                  {DAY_LABELS.map((d, idx) => {
                    const active = it.days.length === 0 || it.days.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleDay(it.id, idx)}
                        className={`size-7 rounded-lg text-[11px] font-semibold transition-colors ${
                          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {it.days.length === 0 ? "Setiap hari" : `${it.days.length} hari`}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
