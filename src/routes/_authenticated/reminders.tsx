import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { PushNotifications } from "@/components/push-notifications";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Bell, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_REMINDERS,
  loadReminders,
  saveReminders,
  type Reminder,
  type ReminderCategory,
} from "@/lib/reminders-store";
import {
  AddReminderForm,
  NextReminderSummary,
  ReminderRow,
} from "@/features/reminders/components/ReminderPieces";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: RemindersPage,
});

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
    <main className="min-h-dvh bg-background pb-28">
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

        <NextReminderSummary
          activeCount={activeCount}
          total={items.length}
          next={next}
          fmtCountdown={fmtCountdown}
        />

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
          <AddReminderForm
            newLabel={newLabel}
            setNewLabel={setNewLabel}
            newTime={newTime}
            setNewTime={setNewTime}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            onCancel={() => setShowAdd(false)}
            onAdd={addItem}
          />
        ) : null}

        <section className="space-y-2 animate-fade-up">
          {items.map((it) => (
            <ReminderRow
              key={it.id}
              it={it}
              onToggle={() => toggle(it.id)}
              onUpdateLabel={(v) => updateLabel(it.id, v)}
              onUpdateTime={(v) => updateTime(it.id, v)}
              onToggleDay={(day) => toggleDay(it.id, day)}
              onRemove={() => removeItem(it.id)}
            />
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}