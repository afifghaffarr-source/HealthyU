/**
 * /admin/i18n — translation override editor.
 *
 * Lets admins edit copy without redeploy. Sidebar lists all 900+ keys
 * (from bundled i18n.tsx) with override status. Click a key to edit
 * both id + en values. Falls back to bundled value if override is empty.
 *
 * Search + override filter (all / overridden / default).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Languages,
  RotateCcw,
  Save,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useTranslation } from "@/lib/i18n";
import {
  deleteI18nOverride,
  listAllTranslationKeys,
  setI18nOverride,
  type TranslationRow,
} from "@/features/admin/lib/adminI18n.functions";

export const Route = createFileRoute("/_authenticated/admin/i18n")({
  component: I18nAdminPage,
});

type OverrideFilter = "all" | "overridden" | "default";

function I18nAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OverrideFilter>("all");
  const [selected, setSelected] = useState<TranslationRow | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin", "i18n", search, filter],
    queryFn: () =>
      listAllTranslationKeys({ data: { search: search || undefined, overrideFilter: filter } }),
  });

  const setMut = useMutation({
    mutationFn: (input: { key: string; locale: "id" | "en"; value: string }) =>
      setI18nOverride({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "i18n"] });
      setFeedback({ kind: "ok", msg: t("admin.i18n.savedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const delMut = useMutation({
    mutationFn: (input: { key: string; locale: "id" | "en" }) =>
      deleteI18nOverride({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "i18n"] });
      setFeedback({ kind: "ok", msg: t("admin.i18n.revertedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar title={t("admin.i18n.title")} showBack />

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3" /> {t("admin.config.backToAdmin")}
        </Link>

        <header>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Languages className="size-5 text-primary" />
            {t("admin.i18n.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.i18n.subtitle")}</p>
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

        {/* Search + filter bar */}
        <div className="flex gap-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.i18n.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as OverrideFilter)}
            className="text-xs bg-muted/60 border border-transparent rounded-xl px-3 py-2 font-semibold outline-none focus:border-primary"
          >
            <option value="all">{t("admin.i18n.filterAll")}</option>
            <option value="overridden">{t("admin.i18n.filterOverridden")}</option>
            <option value="default">{t("admin.i18n.filterDefault")}</option>
          </select>
        </div>

        {/* Two-column layout: list + edit panel */}
        <div className="grid sm:grid-cols-[300px_1fr] gap-3">
          {/* Key list */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">{t("common.loading")}</p>
            ) : (rows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {t("admin.i18n.empty")}
              </p>
            ) : (
              <ul>
                {(rows ?? []).map((r) => (
                  <li key={r.key}>
                    <button
                      onClick={() => setSelected(r)}
                      className={`w-full text-left px-3 py-2 border-b border-border/30 last:border-0 transition ${
                        selected?.key === r.key ? "bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono truncate flex-1">{r.key}</p>
                        {r.overridden && (
                          <span
                            className="size-1.5 rounded-full bg-amber-500 shrink-0"
                            title="Overridden"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {r.id_value}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Edit panel */}
          <div>
            {selected ? (
              <EditPanel
                row={selected}
                onSave={(locale, value) => setMut.mutate({ key: selected.key, locale, value })}
                onRevert={(locale) => delMut.mutate({ key: selected.key, locale })}
                saving={setMut.isPending}
                reverting={delMut.isPending}
              />
            ) : (
              <div className="bg-card border border-border/40 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                {t("admin.i18n.selectKeyPrompt")}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function EditPanel({
  row,
  onSave,
  onRevert,
  saving,
  reverting,
}: {
  row: TranslationRow;
  onSave: (locale: "id" | "en", value: string) => void;
  onRevert: (locale: "id" | "en") => void;
  saving: boolean;
  reverting: boolean;
}) {
  const { t } = useTranslation();
  const [idDraft, setIdDraft] = useState(row.id_override ?? row.id_value);
  const [enDraft, setEnDraft] = useState(row.en_override ?? row.en_value);

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono font-semibold break-all">{row.key}</p>
        {row.overridden && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded-full">
            {t("admin.i18n.overriddenBadge")}
          </span>
        )}
      </div>

      {/* ID field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Bahasa Indonesia (id)
          </label>
          {row.id_override && (
            <button
              onClick={() => onRevert("id")}
              disabled={reverting}
              className="text-[11px] inline-flex items-center gap-1 text-rose-600 disabled:opacity-50"
            >
              <RotateCcw className="size-3" />
              {t("admin.i18n.revert")}
            </button>
          )}
        </div>
        <textarea
          value={idDraft}
          onChange={(e) => setIdDraft(e.target.value)}
          rows={2}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {row.id_override && (
          <p className="text-[11px] text-muted-foreground mt-1 line-through">
            default: {row.id_value}
          </p>
        )}
        <button
          onClick={() => onSave("id", idDraft)}
          disabled={saving || idDraft === (row.id_override ?? row.id_value)}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
        >
          <Save className="size-3" />
          {saving ? t("common.saving") : t("admin.i18n.saveId")}
        </button>
      </div>

      {/* EN field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground">English (en)</label>
          {row.en_override && (
            <button
              onClick={() => onRevert("en")}
              disabled={reverting}
              className="text-[11px] inline-flex items-center gap-1 text-rose-600 disabled:opacity-50"
            >
              <RotateCcw className="size-3" />
              {t("admin.i18n.revert")}
            </button>
          )}
        </div>
        <textarea
          value={enDraft}
          onChange={(e) => setEnDraft(e.target.value)}
          rows={2}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {row.en_override && (
          <p className="text-[11px] text-muted-foreground mt-1 line-through">
            default: {row.en_value}
          </p>
        )}
        <button
          onClick={() => onSave("en", enDraft)}
          disabled={saving || enDraft === (row.en_override ?? row.en_value)}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
        >
          <Save className="size-3" />
          {saving ? t("common.saving") : t("admin.i18n.saveEn")}
        </button>
      </div>
    </div>
  );
}
