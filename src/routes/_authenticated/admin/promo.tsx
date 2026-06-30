/**
 * /admin/promo — promo code manager.
 *
 * List promo codes, create/edit/delete via drawer, toggle active inline.
 * Uses adminPromo.functions.ts (admin-guarded server fns).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Ticket,
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
  createPromoAdmin,
  deletePromoAdmin,
  listPromosAdmin,
  updatePromoAdmin,
  type PromoRow,
} from "@/features/admin/lib/adminPromo.functions";

export const Route = createFileRoute("/_authenticated/admin/promo")({
  component: PromoAdminPage,
});

const REWARD_TYPES = ["coins", "xp", "premium_days"] as const;

type CreateInput = {
  code: string;
  label: string;
  description?: string | null;
  reward_type: (typeof REWARD_TYPES)[number];
  reward_value: number;
  max_uses: number;
  expires_at?: string | null;
};

type UpdateInput = {
  id: string;
  label?: string;
  description?: string | null;
  reward_type?: (typeof REWARD_TYPES)[number];
  reward_value?: number;
  max_uses?: number;
  is_active?: boolean;
  expires_at?: string | null;
};

function emptyDraft(): CreateInput {
  return {
    code: "",
    label: "",
    description: null,
    reward_type: "coins",
    reward_value: 100,
    max_uses: 100,
    expires_at: null,
  };
}

function PromoAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PromoRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "promos"],
    queryFn: () => listPromosAdmin(),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateInput) => createPromoAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promos"] });
      setFeedback({ kind: "ok", msg: t("admin.promo.savedOk") });
      setCreating(false);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (input: UpdateInput) => updatePromoAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promos"] });
      setFeedback({ kind: "ok", msg: t("admin.promo.savedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePromoAdmin({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promos"] });
      setFeedback({ kind: "ok", msg: t("admin.promo.deletedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const duplicateMut = useMutation({
    mutationFn: (row: PromoRow) =>
      createPromoAdmin({
        data: {
          code: `${row.code}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          label: row.label,
          description: row.description,
          reward_type: row.reward_type,
          reward_value: row.reward_value,
          max_uses: row.max_uses,
          // Ponytail: Postgres returns expires_at dengan offset +00:00, Zod
          // z.string().datetime() expects trailing Z (UTC). Konversi normalize
          // supaya duplikat promo tidak gagal validasi "Invalid datetime".
          expires_at: row.expires_at ? row.expires_at.replace(/\+00:00$/, "Z") : null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promos"] });
      setFeedback({ kind: "ok", msg: t("admin.promo.duplicatedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const toggleActive = (row: PromoRow) => {
    updateMut.mutate({ id: row.id, is_active: !row.is_active });
  };

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar
        title={t("admin.promo.title")}
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
              <Ticket className="size-5 text-primary" />
              {t("admin.promo.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.promo.subtitle")}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
          >
            <Plus className="size-4" />
            {t("admin.promo.createBtn")}
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
          <p className="text-sm text-muted-foreground py-8 text-center">{t("admin.promo.empty")}</p>
        ) : (
          <div className="space-y-1.5">
            {(rows ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                className="w-full text-left bg-card border border-border/40 rounded-2xl p-3 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-xs">
                        {r.code}
                      </span>
                      {r.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {r.reward_type} · {r.reward_value} · {t("admin.promo.usesRemaining")}:{" "}
                      {r.uses_remaining}/{r.max_uses}
                      {r.expires_at &&
                        ` · ${t("admin.promo.expiresAt")}: ${new Date(r.expires_at).toLocaleDateString()}`}
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
                      {r.is_active ? t("admin.promo.active") : "—"}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateMut.mutate(r);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary cursor-pointer"
                        title={t("admin.promo.duplicate")}
                      >
                        <Copy className="size-3" /> {t("admin.promo.duplicate")}
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
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <PromoDrawer
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
        <PromoDrawer
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

function PromoDrawer({
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
  const [code, setCode] = useState(draft.code);
  const [label, setLabel] = useState(draft.label);
  const [description, setDescription] = useState(draft.description ?? "");
  const [rewardType, setRewardType] = useState(draft.reward_type);
  const [rewardValue, setRewardValue] = useState(draft.reward_value);
  const [maxUses, setMaxUses] = useState(draft.max_uses);
  const [expiresAt, setExpiresAt] = useState(draft.expires_at ? draft.expires_at.slice(0, 16) : "");

  const handleSubmit = () => {
    const payload: CreateInput & { is_active?: boolean } = {
      code: code.toUpperCase(),
      label,
      description: description.trim() || null,
      reward_type: rewardType,
      reward_value: Number(rewardValue),
      max_uses: Number(maxUses),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
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
            {mode === "create" ? t("admin.promo.createBtn") : t("admin.promo.label")}
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
              {t("admin.promo.code")}
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={mode === "edit"}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.promo.label")}
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.promo.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("admin.promo.rewardType")}
              </label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as (typeof REWARD_TYPES)[number])}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {REWARD_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("admin.promo.rewardValue")}
              </label>
              <input
                type="number"
                value={rewardValue}
                onChange={(e) => setRewardValue(Number(e.target.value))}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.promo.maxUses")}
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.promo.expiresAt")}
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !code || !label}
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
