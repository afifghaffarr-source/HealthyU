import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: RemindersPage,
});

type Reminder = { id: string; label: string; time: string; enabled: boolean };

const DEFAULTS: Reminder[] = [
  { id: "water-morning", label: "Minum air pagi", time: "07:00", enabled: true },
  { id: "water-noon", label: "Minum air siang", time: "12:00", enabled: true },
  { id: "water-evening", label: "Minum air sore", time: "17:00", enabled: true },
  { id: "meds", label: "Cek obat & vitamin", time: "08:00", enabled: false },
  { id: "sleep", label: "Waktunya tidur", time: "22:00", enabled: false },
];

const STORAGE_KEY = "reminders-v1";

function RemindersPage() {
  const [items, setItems] = useState<Reminder[]>(DEFAULTS);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {/* ignore */}
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Scheduler: ticks every 30s and fires due reminders once per day
  useEffect(() => {
    if (permission !== "granted") return;
    const firedKey = "reminders-fired";
    const fired: Record<string, string> = JSON.parse(localStorage.getItem(firedKey) || "{}");
    const today = new Date().toISOString().slice(0, 10);

    const tick = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      items.forEach((it) => {
        if (!it.enabled) return;
        if (it.time !== hhmm) return;
        if (fired[it.id] === today) return;
        new Notification("Pengingat", { body: it.label, icon: "/favicon.ico" });
        fired[it.id] = today;
        localStorage.setItem(firedKey, JSON.stringify(fired));
      });
    };
    const id = setInterval(tick, 30000);
    tick();
    return () => clearInterval(id);
  }, [items, permission]);

  const requestPerm = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") toast.success("Notifikasi diaktifkan");
    else toast.error("Izin notifikasi ditolak");
  };

  const toggle = (id: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));

  const updateTime = (id: string, time: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, time } : i)));

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Pengingat</h1>
        </header>

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
          Pengingat hanya berjalan saat aplikasi terbuka di browser. Untuk pengingat sistem penuh, install sebagai PWA.
        </p>

        <section className="space-y-2 animate-fade-up">
          {items.map((it) => (
            <div key={it.id} className="bg-card p-4 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
              <div className={`size-10 rounded-xl grid place-items-center ${it.enabled ? "bg-mint" : "bg-muted"}`}>
                {it.enabled ? <Bell className="size-4 text-sage-deep" /> : <BellOff className="size-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{it.label}</p>
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
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${it.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}