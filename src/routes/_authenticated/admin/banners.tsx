/**
 * /admin/banners — banner announcements manager.
 *
 * List banners, create/edit/delete via drawer, placement-based (top/middle/bottom).
 * Color picker uses 4 known colors: amber, emerald, blue, rose.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Megaphone,
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
  createBannerAdmin,
  deleteBannerAdmin,
  listBannersAdmin,
  updateBannerAdmin,
  type BannerRow,
} from "@/features/admin/lib/adminPromo.functions";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersAdminPage,
});

const PLACEMENTS = ["top", "middle", "bottom"] as const;
const COLORS = ["amber", "emerald", "blue", "rose"] as const;

type CreateInput = {
  placement: (typeof PLACEMENTS)[number];
  title: string;
  description?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  color: string;
  starts_at?: string;
  ends_at?: string | null;
};

type UpdateInput = {
  id: string;
  placement?: (typeof PLACEMENTS)[number];
  title?: string;
  description?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  color?: string;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string | null;
};

function emptyDraft(): CreateInput {
  return {
    placement: "top",
    title: "",
    description: null,
    cta_label: null,
    cta_href: null,
    color: "amber",
    starts_at: new Date().toISOString(),
    ends_at: null,
  };
}

function BannersAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: () => listBannersAdmin(),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateInput) => createBannerAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
      setFeedback({ kind: "ok", msg: t("admin.banners.savedOk") });
      setCreating(false);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (input: UpdateInput) => updateBannerAdmin({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
      setFeedback({ kind: "ok", msg: t("admin.banners.savedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBannerAdmin({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
      setFeedback({ kind: "ok", msg: t("admin.banners.deletedOk") });
      setEditing(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const toggleActive = (row: BannerRow) => {
    updateMut.mutate({ id: row.id, is_active: !row.is_active });
  };

  const duplicateMut = useMutation({
    mutationFn: (row: BannerRow) =>
      createBannerAdmin({
        data: {
          placement: row.placement,
          title: `${row.title} (copy)`,
          description: row.description,
          cta_label: row.cta_label,
          cta_href: row.cta_href,
          color: row.color,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
      setFeedback({ kind: "ok", msg: t("admin.banners.duplicatedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar
        title={t("admin.banners.title")}
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
              <Megaphone className="size-5 text-primary" />
              {t("admin.banners.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("admin.banners.subtitle")}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl shrink-0"
          >
            <Plus className="size-4" />
            {t("admin.banners.createBtn")}
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
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("admin.banners.empty")}
          </p>
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
                      <span
                        className={`size-2 rounded-full inline-block`}
                        style={{ background: r.color }}
                        aria-hidden
                      />
                      {r.title}
                      <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                        {r.placement}
                      </span>
                    </p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                        {r.description}
                      </p>
                    )}
                    {r.cta_label && (
                      <p className="text-[11px] text-primary mt-1">
                        CTA: {r.cta_label} → {r.cta_href}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("admin.banners.startsAt")}: {new Date(r.starts_at).toLocaleString()}
                      {r.ends_at &&
                        ` · ${t("admin.banners.endsAt")}: ${new Date(r.ends_at).toLocaleString()}`}
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
                      {r.is_active ? t("admin.banners.active") : "—"}
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
                      <Copy className="size-3" /> {t("admin.banners.duplicate")}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <BannerDrawer
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
        <BannerDrawer
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

function BannerDrawer({
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
  const [placement, setPlacement] = useState(draft.placement);
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description ?? "");
  const [ctaLabel, setCtaLabel] = useState(draft.cta_label ?? "");
  const [ctaHref, setCtaHref] = useState(draft.cta_href ?? "");
  const [color, setColor] = useState(
    COLORS.includes(draft.color as (typeof COLORS)[number]) ? draft.color : "amber",
  );
  const [startsAt, setStartsAt] = useState(
    typeof draft.starts_at === "string" && draft.starts_at ? draft.starts_at.slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    typeof draft.ends_at === "string" && draft.ends_at ? draft.ends_at.slice(0, 16) : "",
  );

  const handleSubmit = () => {
    const payload: CreateInput & { is_active?: boolean } = {
      placement,
      title,
      description: description.trim() || null,
      cta_label: ctaLabel.trim() || null,
      cta_href: ctaHref.trim() || null,
      color,
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
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
            {mode === "create" ? t("admin.banners.createBtn") : t("admin.banners.title_field")}
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
              {t("admin.banners.placement")}
            </label>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as (typeof PLACEMENTS)[number])}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.banners.title_field")}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.banners.description")}
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
                {t("admin.banners.ctaLabel")}
              </label>
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("admin.banners.ctaHref")}
              </label>
              <input
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("admin.banners.color")}
            </label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full border-2 transition ${color === c ? "border-primary" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("admin.banners.startsAt")}
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("admin.banners.endsAt")}
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full mt-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !title}
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
