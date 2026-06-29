import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { setAuditOptIn } from "@/features/scan/lib/scanExtras.functions";
import {
  getPiiRedactEnabledFn,
  setPiiRedactEnabledFn,
} from "@/features/privacy/lib/piiRedactToggle.functions";
import { track } from "@/lib/errorReporting";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "@/lib/toast-config";
import { Download, ExternalLink, Settings } from "lucide-react";
import { DeleteAccountSection } from "@/features/privacy/components/delete-account-section";
import { PrivacyVaultHero } from "@/features/privacy/components/privacy-vault-hero";
import { DataInventorySection } from "@/features/privacy/components/data-inventory-section";
import { AuditLogSection } from "@/features/privacy/components/audit-log-section";
import { TelemetryEventsSection } from "@/features/privacy/components/telemetry-events-section";
import { TelemetryChart } from "@/features/privacy/components/telemetry-chart";
import { TelemetryTimelineChart } from "@/features/privacy/components/telemetry-timeline-chart";
import { useTranslation } from "@/lib/i18n";

const getPrivacy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("scan_audit_opt_in, pii_redact_enabled")
      .eq("id", userId)
      .maybeSingle();
    return {
      auditOptIn: data?.scan_audit_opt_in ?? true,
      piiRedactEnabled: data?.pii_redact_enabled ?? false,
    };
  });

const opts = queryOptions({ queryKey: ["privacy"], queryFn: () => getPrivacy() });

export const Route = createFileRoute("/_authenticated/profile/privacy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: NotFound,
});

function NotFound() {
  const { t } = useTranslation();
  return <div className="p-4">{t("privacy.notFound")}</div>;
}

function Page() {
  const { t } = useTranslation();
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const auditFn = useServerFn(setAuditOptIn);
  const redactionFn = useServerFn(setPiiRedactEnabledFn);
  const auditMut = useMutation({
    mutationFn: (enabled: boolean) => auditFn({ data: { enabled } }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["privacy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const redactionMut = useMutation({
    mutationFn: (enabled: boolean) => redactionFn({ data: { enabled } }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["privacy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Sprint 21 telemetry: track first-time Privacy Vault view (DEV-mode no-op).
  useEffect(() => {
    void track("privacy.vault.viewed", {
      audit_opt_in: data.auditOptIn,
      pii_redact_enabled: data.piiRedactEnabled,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar
        title={t("privacy.title")}
        showBack
        action={
          <Link
            to="/pengaturan"
            aria-label={t("privacy.openSettings")}
            className="size-9 rounded-full bg-muted grid place-items-center"
          >
            <Settings className="size-4" />
          </Link>
        }
      />
      <div className="p-4 space-y-3">
        {/* Brankas Privasi — calm reassurance + UU PDP compliance */}
        <PrivacyVaultHero />

        {/* Data Inventory — "apa yang kami simpan" */}
        <DataInventorySection />

        {/* Audit log viewer — "siapa akses apa, kapan" */}
        <AuditLogSection limit={10} />

        {/* Sprint 33: Telemetry events viewer — what `track()` writes */}
        {/* Sprint 42: Telemetry chart — aggregation bar chart, 0 infra */}
        <TelemetryChart className="mb-3" />
        {/* Sprint 43: Timeline chart — 30-day sparkline, 0 infra */}
        <TelemetryTimelineChart className="mb-3" />
        {/* Sprint 33: Telemetry events viewer — what `track()` writes */}
        <TelemetryEventsSection limit={10} />
        {/* Privacy toggles — the existing switches */}
        <div className="rounded-2xl bg-card border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm">{t("privacy.improveAI")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("privacy.improveAIDesc")}</div>
          </div>
          <button
            onClick={() => auditMut.mutate(!data.auditOptIn)}
            disabled={auditMut.isPending}
            className={`shrink-0 w-12 h-7 rounded-full relative transition ${data.auditOptIn ? "bg-primary" : "bg-muted"}`}
            aria-label={t("privacy.toggleAudit")}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white transition ${data.auditOptIn ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        <div className="rounded-2xl bg-card border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm">{t("privacy.autoRedact")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("privacy.autoRedactDesc")}</div>
          </div>
          <button
            onClick={() => redactionMut.mutate(!data.piiRedactEnabled)}
            disabled={redactionMut.isPending}
            className={`shrink-0 w-12 h-7 rounded-full relative transition ${data.piiRedactEnabled ? "bg-primary" : "bg-muted"}`}
            aria-label={t("privacy.togglePiiRedact")}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white transition ${data.piiRedactEnabled ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        <Link
          to="/backup"
          className="rounded-2xl bg-card border p-4 flex items-start gap-3 hover:bg-muted/50 transition"
        >
          <Download className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{t("privacy.downloadData")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("privacy.downloadDataDesc")}
            </div>
          </div>
          <ExternalLink className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        </Link>

        <Link
          to="/privacy"
          className="rounded-2xl bg-card border p-4 flex items-start gap-3 hover:bg-muted/50 transition"
        >
          <ExternalLink className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{t("privacy.policyLinkTitle")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("privacy.policyDesc")}</div>
          </div>
        </Link>

        <DeleteAccountSection />
      </div>
      <BottomNav />
    </div>
  );
}
