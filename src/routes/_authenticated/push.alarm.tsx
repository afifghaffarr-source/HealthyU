import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/push/alarm")({ component: Page });

function Page() {
  const [enabled, setEnabled] = useState<boolean>(
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const enable = async () => {
    if (typeof Notification === "undefined") return toast.error("Tidak didukung");
    const p = await Notification.requestPermission();
    if (p === "granted") {
      setEnabled(true);
      new Notification("Smart Alarm aktif", { body: "Kamu akan diingatkan." });
    } else toast.error("Izin ditolak");
  };
  const test = () => new Notification("⏰ Bangun!", { body: "Window tidur ringan terdeteksi." });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Push Notif Alarm" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-sm">
            Status: <span className="font-semibold">{enabled ? "Aktif" : "Belum"}</span>
          </p>
          {!enabled ? (
            <button
              onClick={enable}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
            >
              Aktifkan
            </button>
          ) : (
            <button onClick={test} className="w-full rounded-lg border py-2 text-sm">
              Test Notifikasi
            </button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
