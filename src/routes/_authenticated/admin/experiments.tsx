/**
 * /admin/experiments — A/B test experiment manager (Sprint 58-E).
 *
 * List experiments, create/edit/delete via drawer, toggle active inline.
 * Uses adminExperiments.functions.ts (admin-guarded server fns).
 * JSON fields (variant_a_json, variant_b_json) are edited in textareas
 * and validated with try { JSON.parse } before submit.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  X,
  Copy,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useTranslation } from "@/lib/i18n";
import {
  createExperimentAdmin,
  deleteExperimentAdmin,
  listExperimentsAdmin,
  updateExperimentAdmin,
  type ExperimentRow,
} from "@/features/admin/lib/adminExperiments.functions";

export const Route = createFileRoute("/_authenticated/admin/experiments")({
  component: ExperimentsAdminPage,
});

type CreateInput = {
  key: string;
  label: string;
  description?: string | null;
  variant_a_json: Record<string, unknown>;
  variant_b_json: Record<string, unknown>;
  split_pct: number;
  is_active?: boolean;
};

type UpdateInput = {
  id: string;
  label?: string;
  description?: string | null;
  variant_a_json?: Record<string, unknown>;
  variant_b_json?: Record<string, unknown>;
  split_pct?: number;
  is_active?: boolean;
};

function emptyDraft(): CreateInput {
  return {
    key: "",
    label: "",
    description: null,
    variant_a_json: {},
    variant_b_json: {},
    split_pct: 50,
  };
}

function ExperimentsAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ExperimentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "experiments"],
    queryFn: () => listExperimentsAdmin(),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateInput) => createExperimentAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "experiments"] });
      setFeedback({ kind: "ok", msg: t("admin.exp.savedOk") });
      setCreating(false);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (input: UpdateInput) => updateExperimentAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "experiments"] });
      setFeedback({ kind: "ok", msg: t("admin.exp.savedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteExperimentAdmin({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "experiments"] });
      setFeedback({ kind: "ok", msg: t("admin.exp.deletedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const toggleActive = (row: ExperimentRow) => {
    updateMut.mutate({ id: row.id, is_active: !row.is_active });
  };

  const duplicateMut = useMutation({
    mutationFn: (row: ExperimentRow) =>
      createExperimentAdmin({
        data: {
          key: `${row.key}-${Date.now().toString(36).slice(-4)}`,
          label: `${row.label} (copy)`,
          description: row.description,
          variant_a_json: row.variant_a_json,
          variant_b_json: row.variant_b_json,
          split_pct: row.split_pct,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "experiments"] });
      setFeedback({ kind: "ok", msg: t("admin.exp.duplicatedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar
        title={t("admin.exp.title")}
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

        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FlaskConical className="size-5 text-primary" />
              {t("admin.exp.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.exp.subtitle")}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
          >
            <Plus className="size-4" />
            {t("admin.exp.createBtn")}
          </button>
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

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
        ) : (rows ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("admin.exp.empty")}</p>
        ) : (
          <div className="space-y-1.5">
            {(rows ?? []).map((r: ExperimentRow) => (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                className="w-full text-left bg-card border border-border/40 rounded-2xl p-3 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-xs">
                        {r.key}
                      </span>
                      {r.label}
                    </p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                        {r.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                      A: {JSON.stringify(r.variant_a_json)} · B: {JSON.stringify(r.variant_b_json)}{" "}
                      · {t("admin.exp.splitPct")}: {r.split_pct}%
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.is_active ? t("admin.exp.active") : "—"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(r);
                      }}
                      className="text-[10px] text-primary underline cursor-pointer"
                    >
                      {r.is_active ? "deactivate" : "activate"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMut.mutate(r);
                      }}
                      className="text-[10px] text-primary underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Copy className="size-3" /> {t("admin.exp.duplicate")}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <ExperimentDrawer
          mode="create"
          draft={emptyDraft()}
          onClose={() => setCreating(false)}
          onSave={(input) => createMut.mutate(input)}
          onDelete={null}
          saving={createMut.isPending}
          deleting={false}
        />
      )}

      {editing && (
        <ExperimentDrawer
          mode="edit"
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => updateMut.mutate({ id: editing.id, ...input } as UpdateInput)}
          onDelete={() => deleteMut.mutate(editing.id)}
          saving={updateMut.isPending}
          deleting={deleteMut.isPending}
        />
      )}
    </main>
  );
}

type DrawerDraft = CreateInput & { is_active?: boolean };

function ExperimentDrawer({
  mode,
  draft,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  mode: "create" | "edit";
  draft: DrawerDraft;
  onClose: () => void;
  onSave: (input: CreateInput & { is_active?: boolean }) => void;
  onDelete: (() => void) | null;
  saving: boolean;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const [key, setKey] = useState(draft.key);
  const [label, setLabel] = useState(draft.label);
  const [description, setDescription] = useState(draft.description ?? "");
  const [variantA, setVariantA] = useState(JSON.stringify(draft.variant_a_json ?? {}, null, 2));
  const [variantB, setVariantB] = useState(JSON.stringify(draft.variant_b_json ?? {}, null, 2));
  const [splitPct, setSplitPct] = useState(draft.split_pct);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const parseJsonOrError = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object");
      }
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const handleSubmit = () => {
    const va = parseJsonOrError(variantA);
    const vb = parseJsonOrError(variantB);
    if (va === null || vb === null) {
      setJsonError(t("admin.exp.invalidJson"));
      return;
    }
    setJsonError(null);
    const payload: CreateInput & { is_active?: boolean } = {
      key,
      label,
      description: description.trim() || null,
      variant_a_json: va,
      variant_b_json: vb,
      split_pct: Number(splitPct),
    };
    if (mode === "edit") payload.is_active = draft.is_active;
    onSave(payload);
  };

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
          <h3 className="font-bold text-base">
            {mode === "create" ? t("admin.exp.createBtn") : t("admin.exp.label")}
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground"
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.key")}
            </label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={mode === "edit"}
              placeholder="landing.heroCta"
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.label")}
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.variantA")}
            </label>
            <textarea
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
              rows={4}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.variantB")}
            </label>
            <textarea
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
              rows={4}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.exp.splitPct")} (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {jsonError && <p className="text-xs text-rose-600 dark:text-rose-400">{jsonError}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !key || !label}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="px-4 bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 font-semibold py-3 rounded-2xl disabled:opacity-50"
              aria-label={t("common.delete")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
