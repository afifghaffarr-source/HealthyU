import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Scale, Ruler, Camera, HeartPulse, ArrowRight, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/body")({
  component: BodyPage,
});

const tabs = [
  { id: "Berat", icon: Scale },
  { id: "Ukuran", icon: Ruler },
  { id: "Foto", icon: Camera },
  { id: "Vitals", icon: HeartPulse },
] as const;
type TabId = (typeof tabs)[number]["id"];

function BodyPage() {
  const [tab, setTab] = useState<TabId>("Berat");
  return (
    <div className="min-h-screen pb-28 px-4 bg-background">
      <TopAppBar title="Body Composition" showBack />
      <div className="mt-4 flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {tabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              tab === id ? "bg-primary text-primary-foreground shadow" : "bg-card border text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {id}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "Berat" && (
          <TabPanel>
            <Metric label="Berat saat ini" value="—" unit="kg" />
            <Metric label="Target" value="—" unit="kg" />
            <Metric label="Tren 30 hari" value="—" unit="kg" />
            <PageLink to="/weight" label="Catat berat" />
            <PageLink to="/weight.chart" label="Grafik berat" />
            <PageLink to="/weight.goal" label="Atur target" />
          </TabPanel>
        )}
        {tab === "Ukuran" && (
          <TabPanel>
            <Metric label="Lingkar pinggang" value="—" unit="cm" />
            <Metric label="Lingkar dada" value="—" unit="cm" />
            <Metric label="Lingkar lengan" value="—" unit="cm" />
            <Metric label="Lingkar paha" value="—" unit="cm" />
            <p className="text-xs text-muted-foreground px-1">
              Catat tiap minggu untuk lihat progres komposisi tubuh.
            </p>
          </TabPanel>
        )}
        {tab === "Foto" && (
          <TabPanel>
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-muted to-card border-2 border-dashed grid place-items-center text-muted-foreground">
              <div className="text-center">
                <Camera className="size-8 mx-auto mb-2" />
                <p className="text-sm">Tambah foto progres</p>
                <p className="text-xs">Depan · Samping · Belakang</p>
              </div>
            </div>
            <button className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2">
              <Plus className="size-4" /> Unggah foto
            </button>
          </TabPanel>
        )}
        {tab === "Vitals" && (
          <TabPanel>
            <Metric label="Tekanan darah" value="—" unit="mmHg" />
            <Metric label="Detak jantung" value="—" unit="bpm" />
            <Metric label="Suhu tubuh" value="—" unit="°C" />
            <Metric label="SpO₂" value="—" unit="%" />
            <PageLink to="/vitals" label="Catat vitals" />
          </TabPanel>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function TabPanel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 animate-fade-up">{children}</div>;
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

function PageLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to as "/weight"} className="flex items-center justify-between rounded-2xl bg-card border border-border/40 p-4 hover:bg-muted/40 transition">
      <span className="text-sm font-semibold">{label}</span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}