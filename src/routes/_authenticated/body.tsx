import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Scale, Ruler, Camera, HeartPulse, ArrowRight, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/body")({
  component: BodyPage,
});

const tabs = [
  { id: "body.tabs.weight", icon: Scale },
  { id: "body.tabs.measurements", icon: Ruler },
  { id: "body.tabs.photo", icon: Camera },
  { id: "body.tabs.vitals", icon: HeartPulse },
] as const;
type TabId = (typeof tabs)[number]["id"];

function BodyPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>(tabs[0].id);
  return (
    <div className="min-h-dvh pb-28 px-4 bg-background">
      <TopAppBar title={t("body.title")} showBack />
      <div className="mt-4 flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {tabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              tab === id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-card border text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {t(id)}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "body.tabs.weight" && (
          <TabPanel>
            <Metric label={t("weight.current")} value="—" unit="kg" />
            <Metric label={t("weight.target")} value="—" unit="kg" />
            <Metric label={t("weight.trend", { count: 30 })} value="—" unit="kg" />
            <PageLink to="/weight" label={t("weight.logToday")} />
            <PageLink to="/weight.chart" label={t("body.weightChart")} />
            <PageLink to="/weight.goal" label={t("body.weightGoal")} />
          </TabPanel>
        )}
        {tab === "body.tabs.measurements" && (
          <TabPanel>
            <Metric label={t("body.measurements.waist")} value="—" unit="cm" />
            <Metric label={t("body.measurements.chest")} value="—" unit="cm" />
            <Metric label={t("body.measurements.arm")} value="—" unit="cm" />
            <Metric label={t("body.measurements.thigh")} value="—" unit="cm" />
            <p className="text-xs text-muted-foreground px-1">{t("body.measurementsHint")}</p>
          </TabPanel>
        )}
        {tab === "body.tabs.photo" && (
          <TabPanel>
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-muted to-card border-2 border-dashed grid place-items-center text-muted-foreground">
              <div className="text-center">
                <Camera className="size-8 mx-auto mb-2" />
                <p className="text-sm">{t("body.photo.addProgress")}</p>
                <p className="text-xs">{t("body.photo.angles")}</p>
              </div>
            </div>
            <button className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2">
              <Plus className="size-4" /> {t("body.photo.upload")}
            </button>
          </TabPanel>
        )}
        {tab === "body.tabs.vitals" && (
          <TabPanel>
            <Metric label={t("body.vitals.bloodPressure")} value="—" unit="mmHg" />
            <Metric label={t("body.vitals.heartRate")} value="—" unit="bpm" />
            <Metric label={t("body.vitals.bodyTemp")} value="—" unit="°C" />
            <Metric label={t("body.vitals.spo2")} value="—" unit="%" />
            <PageLink to="/vitals" label={t("body.vitalsLogLink")} />
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
    <Link
      to={to as "/weight"}
      className="flex items-center justify-between rounded-2xl bg-card border border-border/40 p-4 hover:bg-muted/40 transition"
    >
      <span className="text-sm font-semibold">{label}</span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
