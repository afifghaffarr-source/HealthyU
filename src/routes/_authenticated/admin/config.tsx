/**
 * /admin/config — runtime app config manager.
 *
 * Lists every key in public.app_config grouped by category. Click a row
 * to open an edit drawer (inline form by data_type). All changes write
 * to public.audit_log.
 *
 * Pattern: TanStack Query (queries) + useMutation (writes) + client-side
 * optimistic updates with rollback on error.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useTranslation } from "@/lib/i18n";
import {
  deleteAppConfig,
  listAppConfig,
  setAppConfig,
  type ConfigCategory,
  type ConfigDataType,
  type ConfigRow,
} from "@/features/admin/lib/adminConfig.functions";

export const Route = createFileRoute("/_authenticated/admin/config")({
  component: ConfigAdminPage,
});

const CATEGORIES: { value: ConfigCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "feature", label: "Feature Flags" },
  { value: "defaults", label: "Default User Values" },
  { value: "gamification", label: "Gamification" },
  { value: "ui", label: "UI Copy" },
  { value: "rate_limit", label: "Rate Limits" },
  { value: "general", label: "General" },
];

function ConfigAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ConfigCategory | "all">("all");
  const [editing, setEditing] = useState<ConfigRow | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "config", filter],
    queryFn: () => listAppConfig({ data: { category: filter === "all" ? undefined : filter } }),
  });

  const setMut = useMutation({
    mutationFn: (input: {
      key: string;
      value: string | number | boolean | null;
      label?: string;
      description?: string;
      data_type?: ConfigDataType;
      category?: ConfigCategory;
    }) => setAppConfig({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
      setFeedback({ kind: "ok", msg: t("admin.config.savedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const delMut = useMutation({
    mutationFn: (key: string) => deleteAppConfig({ data: { key } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
      setFeedback({ kind: "ok", msg: t("admin.config.deletedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const grouped = (rows ?? []).reduce<Record<string, ConfigRow[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar
        title={t("admin.config.title")}
        showBack
        action={
          <button
            onClick={() => refetch()}
            className="size-9 grid place-items-center rounded-full bg-muted"
            aria-label={t("common.refresh")}
          >
            <RefreshCw className="size-4" />
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3" /> {t("admin.config.backToAdmin")}
        </Link>

        <header>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            {t("admin.config.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.config.subtitle")}</p>
        </header>

        {feedback && (
          <div
            className={`rounded-2xl p-3 flex items-center gap-2 text-sm ${
              feedback.kind === "ok"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            {feedback.kind === "ok" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                filter === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
        ) : (rows ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("admin.config.empty")}
          </p>
        ) : filter === "all" ? (
          // grouped view
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <section key={cat} className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {CATEGORIES.find((c) => c.value === cat)?.label ?? cat} ({items.length})
                </h2>
                <div className="space-y-1.5">
                  {items.map((r) => (
                    <ConfigRow key={r.key} row={r} onEdit={() => setEditing(r)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {(rows ?? []).map((r) => (
              <ConfigRow key={r.key} row={r} onEdit={() => setEditing(r)} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditDrawer
          key={editing.key}
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(value) =>
            setMut.mutate({
              key: editing.key,
              value,
              data_type: editing.data_type,
              category: editing.category as ConfigCategory,
              label: editing.label,
              description: editing.description ?? undefined,
            })
          }
          onDelete={() => delMut.mutate(editing.key)}
          saving={setMut.isPending}
          deleting={delMut.isPending}
        />
      )}
    </main>
  );
}

function ConfigRow({ row, onEdit }: { row: ConfigRow; onEdit: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onEdit}
      className="w-full text-left bg-card border border-border/40 rounded-2xl p-3 hover:border-primary/40 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{row.label}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{row.key}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground mt-1.5">{row.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-primary tabular-nums">
            {typeof row.value === "string" ? `"${row.value}"` : String(row.value ?? "—")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            {row.data_type}
          </p>
        </div>
      </div>
    </button>
  );
}

function EditDrawer({
  row,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  row: ConfigRow;
  onClose: () => void;
  onSave: (value: string | number | boolean | null) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string>(String(row.value ?? ""));

  const parsed = (() => {
    if (row.data_type === "boolean") return draft === "true";
    if (row.data_type === "number") {
      const n = Number(draft);
      return Number.isNaN(n) ? null : n;
    }
    return draft;
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">{row.label}</h3>
          <button onClick={onClose} className="text-xs text-muted-foreground">
            ✕
          </button>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground">{row.key}</p>
        {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}

        <div>
          <label className="text-xs font-semibold text-muted-foreground">
            {t("admin.config.value")} ({row.data_type})
          </label>
          {row.data_type === "boolean" ? (
            <div className="flex gap-2 mt-2">
              {["true", "false"].map((v) => (
                <button
                  key={v}
                  onClick={() => setDraft(v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                    draft === v
                      ? v === "true"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : row.data_type === "number" ? (
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full mt-2 bg-muted rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full mt-2 bg-muted rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSave(parsed)}
            disabled={saving || parsed === null}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? t("common.saving") : t("common.save")}
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-4 bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 font-semibold py-3 rounded-2xl disabled:opacity-50"
            aria-label={t("common.delete")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
