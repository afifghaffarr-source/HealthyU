import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollText, Eye, Trash2, Brain } from "lucide-react";
import { listAuditEvents, type AuditEvent } from "@/features/admin/lib/adminAudit.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "audit", category],
    queryFn: () => listAuditEvents({ data: { category: category || undefined, limit: 100 } }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold">{t("admin.audit.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.audit.subtitle")}</p>
      </header>

      {/* Category filter */}
      {data && data.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 bg-card rounded-2xl p-3 outline-1 outline-black/5">
          <button
            onClick={() => setCategory("")}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              !category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t("admin.audit.allCount", {
              count: data.categories.reduce((s, c) => s + c.count, 0),
            })}
          </button>
          {data.categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setCategory(c.category)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                category === c.category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive font-mono">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <ScrollText className="size-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground">{t("admin.audit.empty")}</p>
        </div>
      ) : data ? (
        <div className="bg-card rounded-2xl outline-1 outline-black/5 divide-y divide-black/5">
          {data.items.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 text-left"
            >
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {e.category === "ai_call" ? (
                  <Brain className="size-4 text-blue-600" />
                ) : (
                  <Trash2 className="size-4 text-destructive" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{e.action}</p>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                    {e.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {new Date(e.created_at).toLocaleString("id-ID")} · actor=
                  {e.actor_id?.slice(0, 8) ?? "—"}
                </p>
              </div>
              <Eye className="size-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="size-5 text-primary" />
              <h3 className="font-bold text-lg">{selected.action}</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-auto">
                {selected.category}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <Field
                label={t("admin.audit.fieldWhen")}
                value={new Date(selected.created_at).toLocaleString("id-ID")}
              />
              <Field label={t("admin.audit.fieldActor")} value={selected.actor_id ?? "—"} mono />
              <Field label={t("admin.audit.fieldTarget")} value={selected.target_id ?? "—"} mono />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {t("admin.audit.metadata")}
              </p>
              <pre className="bg-muted rounded-xl p-3 text-xs font-mono overflow-x-auto">
                {JSON.stringify(selected.meta, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full px-4 py-2.5 rounded-xl bg-muted font-medium"
            >
              {t("admin.audit.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-20 text-xs font-semibold text-muted-foreground shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
