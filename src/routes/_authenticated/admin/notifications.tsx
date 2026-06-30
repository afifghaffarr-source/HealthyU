/**
 * /admin/notifications — notification + email template editor.
 *
 * Edits `public.notification_templates` rows (channel + template_key +
 * locale triples) so admins can rewrite email subjects, push titles, and
 * (eventually) body copy without a code deploy. Replaces hardcoded
 * strings in `requestDigest.functions.ts` and `push.server.ts`.
 *
 * Two-column layout: list of templates (with channel/locale filter) on
 * the left, edit panel on the right with live variable preview.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Mail,
  Smartphone,
  Save,
  Trash2,
  Eye,
  X,
  Power,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useTranslation } from "@/lib/i18n";
import {
  deleteNotificationTemplate,
  listNotificationTemplates,
  toggleNotificationTemplate,
  upsertNotificationTemplate,
  type NotificationTemplate,
} from "@/features/admin/lib/adminNotificationTemplates.functions";

type UpsertInput = {
  channel: "email" | "push";
  template_key: string;
  locale: "id" | "en";
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  variables: string[];
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsAdminPage,
});

type ChannelFilter = "all" | "email" | "push";
type LocaleFilter = "all" | "id" | "en";

function NotificationsAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all");
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const {
    data: rows,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "notifications", channelFilter, localeFilter],
    queryFn: () =>
      listNotificationTemplates({
        data: {
          channel: channelFilter === "all" ? undefined : channelFilter,
          locale: localeFilter === "all" ? undefined : localeFilter,
        },
      }),
  });

  const filteredRows = useMemo(() => {
    const list = rows ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.template_key.toLowerCase().includes(q) || (r.subject ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const upsertMut = useMutation({
    mutationFn: (input: UpsertInput) => upsertNotificationTemplate({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setFeedback({ kind: "ok", msg: t("admin.notif.savedOk") });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteNotificationTemplate({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setFeedback({ kind: "ok", msg: t("admin.notif.deletedOk") });
      setSelected(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  const toggleMut = useMutation({
    mutationFn: (input: { id: number; is_active: boolean }) =>
      toggleNotificationTemplate({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
  });

  return (
    <main className="min-h-dvh bg-background pb-32">
      <TopAppBar title={t("admin.notif.title")} showBack />

      <div className="max-w-6xl mx-auto px-4 pt-4 space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3" /> {t("admin.config.backToAdmin")}
        </Link>

        <header>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {t("admin.notif.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.notif.subtitle")}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t("admin.notif.fallbackHint")}</p>
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

        {/* Filter bar */}
        <div className="flex gap-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.notif.searchPlaceholder")}
              className="w-full pl-3 pr-3 py-2 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm"
            />
          </div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
            className="text-xs bg-muted/60 border border-transparent rounded-xl px-3 py-2 font-semibold outline-none focus:border-primary"
          >
            <option value="all">{t("admin.notif.channelAll")}</option>
            <option value="email">{t("admin.notif.channelEmail")}</option>
            <option value="push">{t("admin.notif.channelPush")}</option>
          </select>
          <select
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value as LocaleFilter)}
            className="text-xs bg-muted/60 border border-transparent rounded-xl px-3 py-2 font-semibold outline-none focus:border-primary"
          >
            <option value="all">{t("admin.notif.localeAll")}</option>
            <option value="id">id</option>
            <option value="en">en</option>
          </select>
        </div>

        {/* Two-column layout: list + edit panel */}
        <div className="grid sm:grid-cols-[320px_1fr] gap-3">
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">{t("common.loading")}</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {t("admin.notif.empty")}
              </p>
            ) : (
              <ul>
                {filteredRows.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r)}
                      className={`w-full text-left px-3 py-2 border-b border-border/30 last:border-0 transition ${
                        selected?.id === r.id ? "bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {r.channel === "email" ? (
                          <Mail className="size-3 text-sky-500 shrink-0" />
                        ) : (
                          <Smartphone className="size-3 text-purple-500 shrink-0" />
                        )}
                        <p className="text-xs font-mono font-semibold truncate flex-1">
                          {r.template_key}
                        </p>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {r.locale}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.subject ?? "—"}
                      </p>
                      {!r.is_active && (
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 px-1.5 py-0.5 rounded mt-1">
                          {t("admin.notif.disabledBadge")}
                        </span>
                      )}
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
                onSave={(input) => upsertMut.mutate(input)}
                onDelete={() => {
                  if (window.confirm(t("admin.notif.confirmDelete"))) {
                    deleteMut.mutate(selected.id);
                  }
                }}
                onToggle={(isActive) => toggleMut.mutate({ id: selected.id, is_active: isActive })}
                saving={upsertMut.isPending}
                deleting={deleteMut.isPending}
                toggling={toggleMut.isPending}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="bg-card border border-border/40 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                <Bell className="size-8 mx-auto mb-2 text-muted-foreground/50" />
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
  onDelete,
  onToggle,
  saving,
  deleting,
  toggling,
  onClose,
}: {
  row: NotificationTemplate;
  onSave: (input: UpsertInput) => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
  saving: boolean;
  deleting: boolean;
  toggling: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(row.subject ?? "");
  const [bodyText, setBodyText] = useState(row.body_text ?? "");
  const [bodyHtml, setBodyHtml] = useState(row.body_html ?? "");
  const [varsRaw, setVarsRaw] = useState(row.variables.join(", "));
  const [isActive, setIsActive] = useState(row.is_active);
  const [previewInput, setPreviewInput] = useState("user_name=Andi, pattern_count=12");

  const variables = useMemo(
    () =>
      varsRaw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    [varsRaw],
  );

  // Build a preview by interpolating {var} placeholders.
  const previewVars = useMemo(() => {
    const out: Record<string, string> = {};
    previewInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.includes("="))
      .forEach((s) => {
        const [k, ...rest] = s.split("=");
        out[k.trim()] = rest.join("=").trim();
      });
    return out;
  }, [previewInput]);

  const interpolatedSubject = useMemo(
    () => interpolate(subject, previewVars),
    [subject, previewVars],
  );
  const interpolatedBody = useMemo(
    () => interpolate(bodyText, previewVars),
    [bodyText, previewVars],
  );

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {row.channel === "email" ? (
            <Mail className="size-4 text-sky-500 shrink-0" />
          ) : (
            <Smartphone className="size-4 text-purple-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold break-all">{row.template_key}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.channel} · {row.locale} · {t("admin.notif.updatedAt")}{" "}
              {new Date(row.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Subject */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
          {t("admin.notif.subject")}
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={200}
        />
      </div>

      {/* Body text (only for email) */}
      {row.channel === "email" && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            {t("admin.notif.bodyText")}
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={5}
            className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            maxLength={20_000}
          />
        </div>
      )}

      {/* Body HTML (only for email) */}
      {row.channel === "email" && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            {t("admin.notif.bodyHtml")}
          </label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={4}
            className="w-full bg-muted rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
            maxLength={50_000}
            placeholder="<h1>Hi {user_name}</h1>..."
          />
        </div>
      )}

      {/* Variables */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
          {t("admin.notif.variables")}
        </label>
        <input
          value={varsRaw}
          onChange={(e) => setVarsRaw(e.target.value)}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-[11px] text-muted-foreground mt-1">{t("admin.notif.variablesHint")}</p>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
        <div>
          <p className="text-xs font-semibold">{t("admin.notif.isActive")}</p>
          <p className="text-[11px] text-muted-foreground">
            {isActive ? t("admin.notif.toggleDisable") : t("admin.notif.toggleEnable")}
          </p>
        </div>
        <button
          onClick={() => {
            const next = !isActive;
            setIsActive(next);
            onToggle(next);
          }}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Preview */}
      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 border border-border/40">
        <div className="flex items-center gap-1.5">
          <Eye className="size-3.5 text-primary" />
          <p className="text-xs font-semibold">{t("admin.notif.preview")}</p>
        </div>
        <input
          value={previewInput}
          onChange={(e) => setPreviewInput(e.target.value)}
          className="w-full bg-background rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-primary/30"
          placeholder={t("admin.notif.previewSampleVars")}
        />
        <p className="text-[11px] text-muted-foreground">{t("admin.notif.previewHint")}</p>
        <div className="bg-background rounded-lg p-2 space-y-1">
          {subject && <p className="text-xs font-semibold break-words">{interpolatedSubject}</p>}
          {bodyText && (
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
              {interpolatedBody}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() =>
            onSave({
              channel: row.channel,
              template_key: row.template_key,
              locale: row.locale,
              subject: subject || null,
              body_text: bodyText || null,
              body_html: bodyHtml || null,
              variables,
              is_active: isActive,
            })
          }
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {saving ? t("common.saving") : t("admin.notif.save")}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-semibold py-2.5 px-3 rounded-xl disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Lightweight client-side interpolation. Mirrors the server-side
 * implementation in adminNotificationTemplates.functions.ts so the
 * preview matches what callers will see.
 */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}
