import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Database,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  HardDrive,
  Globe,
} from "lucide-react";
import { getSystemHealth, type CronHealth } from "@/features/admin/lib/adminSystem.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/system")({
  component: AdminSystemPage,
});

function AdminSystemPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "system"],
    queryFn: () => getSystemHealth({ data: {} }),
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every minute
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.system.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.system.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-muted-foreground font-mono">
              {t("admin.system.lastSync", {
                time: new Date(dataUpdatedAt).toLocaleTimeString("id-ID"),
              })}
            </p>
          )}
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
          >
            {t("admin.system.refresh")}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive font-mono">{(error as Error).message}</p>
        </div>
      )}

      {isLoading || !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* App + Database */}
          <section className="grid md:grid-cols-2 gap-4">
            <Card
              icon={<Globe className="size-4 text-primary" />}
              title={t("admin.system.application")}
            >
              <KV k={t("admin.system.kvName")} v={data.app.name} />
              <KV
                k={t("admin.system.kvUrl")}
                v={
                  <Link to="/" className="text-primary underline">
                    {data.app.url}
                  </Link>
                }
              />
              <KV k={t("admin.system.kvEnvironment")} v={data.app.environment} mono />
            </Card>

            <Card
              icon={<Database className="size-4 text-primary" />}
              title={t("admin.system.supabase")}
            >
              <KV k={t("admin.system.kvProject")} v={data.database.projectRef} mono />
              <KV k={t("admin.system.kvRegion")} v={data.database.region} />
              <KV
                k={t("admin.system.kvTables")}
                v={
                  <>
                    {t("admin.system.tablesSummary", {
                      tables: data.database.tablesCount,
                      rows: data.database.totalRows.toLocaleString("id-ID"),
                    })}
                  </>
                }
              />
            </Card>
          </section>

          {/* AI usage */}
          <Card icon={<Brain className="size-4 text-primary" />} title={t("admin.system.aiUsage")}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat label={t("admin.system.last24h")} value={data.ai.last24h} />
              <MiniStat label={t("admin.system.last7d")} value={data.ai.last7d} />
            </div>
            {data.ai.byFeature.length > 0 && (
              <div className="border-t border-black/5 pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("admin.system.topFeatures")}
                </p>
                <ul className="space-y-1.5">
                  {data.ai.byFeature.map((f) => {
                    const max = data.ai.byFeature[0]?.calls ?? 1;
                    const pct = Math.round((f.calls / max) * 100);
                    return (
                      <li key={f.feature} className="flex items-center gap-3 text-sm">
                        <code className="w-44 truncate text-xs bg-muted px-1.5 py-0.5 rounded">
                          {f.feature}
                        </code>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold tabular-nums w-10 text-right">
                          {f.calls}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          {/* Cron jobs */}
          <Card icon={<Clock className="size-4 text-primary" />} title={t("admin.system.cronJobs")}>
            <div className="divide-y divide-black/5 -mx-5">
              {data.cron.map((c) => (
                <CronRow key={c.name} cron={c} />
              ))}
            </div>
          </Card>

          {/* Backup */}
          <Card
            icon={<HardDrive className="size-4 text-primary" />}
            title={t("admin.system.backups")}
          >
            <KV
              k={t("admin.system.kvLastBackup")}
              v={
                data.backup.lastBackupAt
                  ? new Date(data.backup.lastBackupAt).toLocaleString("id-ID")
                  : t("admin.system.never")
              }
            />
            <KV
              k={t("admin.system.kvRetention")}
              v={t("admin.system.kvRetention", { days: data.backup.retentionDays })}
            />
            <KV
              k={t("admin.system.kvLocalPath")}
              v={
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/backups/healthyu/</code>
              }
            />
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-black/5">
              <Server className="size-3 inline mr-1" />
              {t("admin.system.backupHint", {
                script: "backup_supabase.sh",
                verifyCmd: "ssh ubuntu@server && ls -lt ~/backups/healthyu/ | head",
              })}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 outline-1 outline-black/5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="w-24 text-xs font-semibold text-muted-foreground shrink-0">{k}</span>
      <span className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-xl px-3 py-2">
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function CronRow({ cron }: { cron: CronHealth }) {
  const { t } = useTranslation();
  const Icon =
    cron.lastStatus === "success"
      ? CheckCircle2
      : cron.lastStatus === "failure"
        ? XCircle
        : HelpCircle;
  const color =
    cron.lastStatus === "success"
      ? "text-emerald-600"
      : cron.lastStatus === "failure"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <Icon className={`size-4 ${color} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-medium">{cron.name}</code>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {cron.schedule}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{cron.description}</p>
      </div>
      <span className="text-xs text-muted-foreground font-mono shrink-0">
        {cron.lastRunAt
          ? new Date(cron.lastRunAt).toLocaleString("id-ID", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : t("admin.system.never")}
      </span>
    </div>
  );
}
