import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/body")({
  component: BodyPage,
});

const tabs = ["Berat", "Ukuran", "Foto", "Vitals"] as const;

function BodyPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Berat");
  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title="Body Composition" showBack />
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-card p-5 border border-border/40">
        <p className="text-sm text-muted-foreground">Tab aktif: <span className="font-semibold text-foreground">{tab}</span></p>
        <p className="text-xs text-muted-foreground mt-2">
          Gunakan halaman terkait (Berat, Vitals) untuk input detail. Riwayat 30 hari otomatis muncul di Reports.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}