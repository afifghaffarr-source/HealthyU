import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  Activity,
  AlertTriangle,
  Ban,
  Unlock,
  LogOut,
  Info,
  X,
} from "lucide-react";
import {
  listUsersAdmin,
  grantRoleAdmin,
  revokeRoleAdmin,
  banUserAdmin,
  unbanUserAdmin,
  forceLogoutUserAdmin,
  getUserDetailsAdmin,
  type UserListItem,
} from "@/features/admin/lib/adminUsers.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { useAppConfigMap } from "@/hooks/use-app-config";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

const PER_PAGE = 25;

type DetailData = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    banned_at: string | null;
    banned_reason: string | null;
    force_logout_at: string | null;
    created_at: string;
  };
  roles: string[];
  recent_audit: Array<{
    id: string;
    action: string;
    meta: unknown;
    created_at: string;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceDetail(raw: any): DetailData | null {
  if (!raw) return null;
  return {
    profile: {
      id: raw.profile?.id ?? "",
      email: raw.profile?.email ?? null,
      full_name: raw.profile?.full_name ?? null,
      banned_at: raw.profile?.banned_at ?? null,
      banned_reason: raw.profile?.banned_reason ?? null,
      force_logout_at: raw.profile?.force_logout_at ?? null,
      created_at: raw.profile?.created_at ?? new Date().toISOString(),
    },
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    recent_audit: Array.isArray(raw.recent_audit) ? raw.recent_audit : [],
  };
}

function AdminUsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const [myUserId, setMyUserId] = useState<string | undefined>(undefined);

  // Ban dialog state
  const [banTarget, setBanTarget] = useState<UserListItem | null>(null);
  const [banReason, setBanReason] = useState("");

  // Confirm dialog state (unban, force logout)
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserListItem;
    action: "unban" | "forceLogout";
  } | null>(null);

  // Detail drawer state
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id));
  }, []);

  const updateSearch = (v: string) => {
    setSearch(v);
    setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 300);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", debouncedSearch, page],
    queryFn: () =>
      listUsersAdmin({
        data: { search: debouncedSearch || undefined, page, perPage: PER_PAGE },
      }),
    staleTime: 30_000,
  });

  // Live feature flag indicator (so admin can see which gates are ON)
  const flags = useAppConfigMap([
    "feature.ai_coach",
    "feature.scan_label",
    "feature.scan_photo",
    "feature.fasting",
    "feature.gamification",
  ]);

  const grantMut = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" | "user" }) =>
      grantRoleAdmin({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const revokeMut = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" | "user" }) =>
      revokeRoleAdmin({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const banMut = useMutation({
    mutationFn: (vars: { userId: string; reason: string }) => banUserAdmin({ data: vars }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user", "detail", vars.userId] });
      const email = data?.items.find((u) => u.id === vars.userId)?.email ?? vars.userId;
      toast.success(t("admin.users.bannedSuccess", { email }));
      setBanTarget(null);
      setBanReason("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const unbanMut = useMutation({
    mutationFn: (vars: { userId: string }) => unbanUserAdmin({ data: vars }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user", "detail", vars.userId] });
      const email = data?.items.find((u) => u.id === vars.userId)?.email ?? vars.userId;
      toast.success(t("admin.users.unbannedSuccess", { email }));
      setConfirmTarget(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const forceLogoutMut = useMutation({
    mutationFn: (vars: { userId: string }) => forceLogoutUserAdmin({ data: vars }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      const email = data?.items.find((u) => u.id === vars.userId)?.email ?? vars.userId;
      toast.success(t("admin.users.forceLogoutSuccess", { email }));
      setConfirmTarget(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 0;
  const anyMutating =
    grantMut.isPending ||
    revokeMut.isPending ||
    banMut.isPending ||
    unbanMut.isPending ||
    forceLogoutMut.isPending;

  return (
    <div className="space-y-4 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Memuat…" : `${data?.total ?? 0} user terdaftar`}
        </p>
      </header>

      {/* Live feature flags panel */}
      <div className="bg-card rounded-2xl outline-1 outline-black/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="size-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold">{t("admin.users.featFlagsTitle")}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">{t("admin.users.featFlagsDesc")}</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            "feature.ai_coach",
            "feature.scan_label",
            "feature.scan_photo",
            "feature.fasting",
            "feature.gamification",
          ].map((k) => {
            const on = flags[k] === true;
            return (
              <span
                key={k}
                className={
                  "text-[10px] px-2 py-1 rounded-full font-mono font-semibold " +
                  (on
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground line-through")
                }
              >
                {k.replace("feature.", "")} ·{" "}
                {on ? t("admin.users.featFlagEnabled") : t("admin.users.featFlagDisabled")}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-2xl p-3 outline-1 outline-black/5">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input
          type="search"
          placeholder="Cari email…"
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm py-2"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive font-mono">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Tidak ada user ditemukan.</p>
        </div>
      ) : data ? (
        <div className="bg-card rounded-2xl outline-1 outline-black/5 divide-y divide-black/5">
          {data.items.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              myUserId={myUserId}
              onGrant={(role) => grantMut.mutate({ userId: u.id, role })}
              onRevoke={(role) => revokeMut.mutate({ userId: u.id, role })}
              onBan={() => setBanTarget(u)}
              onUnban={() => setConfirmTarget({ user: u, action: "unban" })}
              onForceLogout={() => setConfirmTarget({ user: u, action: "forceLogout" })}
              onDetails={() => setDetailUserId(u.id)}
              isMutating={anyMutating}
            />
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ban dialog */}
      {banTarget && (
        <BanDialog
          target={banTarget}
          reason={banReason}
          onChangeReason={setBanReason}
          onConfirm={() => banMut.mutate({ userId: banTarget.id, reason: banReason.trim() })}
          onCancel={() => {
            setBanTarget(null);
            setBanReason("");
          }}
          isPending={banMut.isPending}
        />
      )}

      {/* Confirm dialog (unban / forceLogout) */}
      {confirmTarget && (
        <ConfirmDialog
          title={
            confirmTarget.action === "unban"
              ? t("admin.users.unbanAction")
              : t("admin.users.forceLogoutAction")
          }
          body={
            confirmTarget.action === "unban"
              ? t("admin.users.unbanConfirm", {
                  email: confirmTarget.user.email ?? confirmTarget.user.id,
                })
              : t("admin.users.forceLogoutConfirm", {
                  email: confirmTarget.user.email ?? confirmTarget.user.id,
                })
          }
          isDanger={confirmTarget.action === "forceLogout"}
          onConfirm={() => {
            if (confirmTarget.action === "unban") {
              unbanMut.mutate({ userId: confirmTarget.user.id });
            } else {
              forceLogoutMut.mutate({ userId: confirmTarget.user.id });
            }
          }}
          onCancel={() => setConfirmTarget(null)}
          isPending={unbanMut.isPending || forceLogoutMut.isPending}
        />
      )}

      {/* Detail drawer */}
      {detailUserId && <DetailDrawer userId={detailUserId} onClose={() => setDetailUserId(null)} />}
    </div>
  );
}

function UserRow({
  u,
  myUserId,
  onGrant,
  onRevoke,
  onBan,
  onUnban,
  onForceLogout,
  onDetails,
  isMutating,
}: {
  u: UserListItem;
  myUserId?: string;
  onGrant: (role: "admin" | "moderator" | "user") => void;
  onRevoke: (role: "admin" | "moderator" | "user") => void;
  onBan: () => void;
  onUnban: () => void;
  onForceLogout: () => void;
  onDetails: () => void;
  isMutating: boolean;
}) {
  const { t } = useTranslation();
  const isMe = u.id === myUserId;
  const isAdmin = u.roles.includes("admin");
  const isModerator = u.roles.includes("moderator");
  const isBanned = u.banned_until && new Date(u.banned_until) > new Date();

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30">
      <div className="size-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
        {(u.email ?? "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{u.email ?? "(no email)"}</p>
          {isMe && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              You
            </span>
          )}
          {isBanned && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5">
              <AlertTriangle className="size-2.5" />
              Banned
            </span>
          )}
          {!u.email_confirmed_at && (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
              Unverified
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-2.5" />
            {new Date(u.created_at).toLocaleDateString("id-ID")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Activity className="size-2.5" />
            {u.last_sign_in_at
              ? `login ${new Date(u.last_sign_in_at).toLocaleDateString("id-ID")}`
              : "never logged in"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
        <button
          onClick={onDetails}
          disabled={isMutating}
          title={t("admin.users.details")}
          className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-foreground/10 disabled:opacity-50"
        >
          <Info className="size-3" />
          {t("admin.users.details")}
        </button>
        {isBanned ? (
          <button
            onClick={onUnban}
            disabled={isMutating}
            className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Unlock className="size-3" />
            {t("admin.users.unbanAction")}
          </button>
        ) : (
          <button
            onClick={onBan}
            disabled={isMutating || isMe}
            title={isMe ? "Tidak bisa ban diri sendiri" : t("admin.users.banAction")}
            className="text-[10px] bg-destructive/10 text-destructive px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-destructive/20 disabled:opacity-50"
          >
            <Ban className="size-3" />
            {t("admin.users.banAction")}
          </button>
        )}
        <button
          onClick={onForceLogout}
          disabled={isMutating || isMe}
          title={isMe ? "Tidak bisa force logout diri sendiri" : t("admin.users.forceLogoutAction")}
          className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-amber-100 disabled:opacity-50"
        >
          <LogOut className="size-3" />
          {t("admin.users.forceLogoutAction")}
        </button>
        {isAdmin ? (
          <button
            onClick={() => onRevoke("admin")}
            disabled={isMutating || isMe}
            title={isMe ? "Tidak bisa revoke admin dari diri sendiri" : "Revoke admin"}
            className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-emerald-100 disabled:opacity-50"
          >
            <ShieldCheck className="size-3" />
            admin
          </button>
        ) : (
          <button
            onClick={() => onGrant("admin")}
            disabled={isMutating}
            className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ShieldOff className="size-3" />
            grant admin
          </button>
        )}
        {isModerator ? (
          <button
            onClick={() => onRevoke("moderator")}
            disabled={isMutating}
            className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold hover:bg-blue-100"
          >
            mod
          </button>
        ) : (
          <button
            onClick={() => onGrant("moderator")}
            disabled={isMutating}
            className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full font-semibold hover:bg-blue-50 hover:text-blue-700"
          >
            +mod
          </button>
        )}
      </div>
    </div>
  );
}

function BanDialog({
  target,
  reason,
  onChangeReason,
  onConfirm,
  onCancel,
  isPending,
}: {
  target: UserListItem;
  reason: string;
  onChangeReason: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2">
            <Ban className="size-4 text-destructive" />
            {t("admin.users.banTitle")}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-muted"
            aria-label={t("admin.users.detailClose")}
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{target.email}</p>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">{t("admin.users.banReason")}</label>
          <textarea
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            placeholder={t("admin.users.banReasonPlaceholder")}
            rows={3}
            className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-1 outline-black/5 focus:outline-foreground/30"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted"
          >
            {t("admin.users.confirmNo")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || reason.trim().length === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {t("admin.users.confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  isDanger,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  body: string;
  isDanger: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted"
          >
            {t("admin.users.confirmNo")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={
              "px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 " +
              (isDanger ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700")
            }
          >
            {t("admin.users.confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const detailQ = useQuery({
    queryKey: ["admin", "user", "detail", userId],
    queryFn: () => getUserDetailsAdmin({ data: { userId } }),
    staleTime: 30_000,
  });

  const data: DetailData | null = coerceDetail(detailQ.data);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md h-full overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("admin.users.detailTitle")}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted"
            aria-label={t("admin.users.detailClose")}
          >
            <X className="size-4" />
          </button>
        </div>

        {detailQ.isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {detailQ.error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
            <p className="text-sm text-destructive font-mono">{t("admin.users.detailLoadFail")}</p>
            <p className="text-xs text-destructive/80 mt-1">{(detailQ.error as Error).message}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{data.profile.email ?? "—"}</p>
              {data.profile.full_name && (
                <>
                  <p className="text-xs text-muted-foreground mt-2">Nama</p>
                  <p className="text-sm font-medium">{data.profile.full_name}</p>
                </>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Roles</p>
              <div className="flex flex-wrap gap-1">
                {data.roles.length === 0 ? (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {t("admin.users.roleUser")}
                  </span>
                ) : (
                  data.roles.map((r) => (
                    <span
                      key={r}
                      className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold"
                    >
                      {r === "admin"
                        ? t("admin.users.roleAdmin")
                        : r === "moderator"
                          ? t("admin.users.roleModerator")
                          : t("admin.users.roleUser")}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              {data.profile.banned_at ? (
                <p className="text-sm text-destructive font-medium">
                  {t("admin.users.bannedBy", {
                    date: new Date(data.profile.banned_at).toLocaleString("id-ID"),
                    reason: data.profile.banned_reason ?? "—",
                  })}
                </p>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">
                  {t("admin.users.neverBanned")}
                </p>
              )}
              {data.profile.force_logout_at && (
                <p className="text-xs text-amber-600 mt-1">
                  Force logout: {new Date(data.profile.force_logout_at).toLocaleString("id-ID")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">{t("admin.users.recentActivity")}</p>
              {data.recent_audit.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("admin.users.noActivity")}</p>
              ) : (
                <div className="space-y-1">
                  {data.recent_audit.map((row) => (
                    <div key={row.id} className="bg-muted/30 rounded-lg px-3 py-2 text-xs">
                      <p className="font-mono font-semibold">{row.action}</p>
                      <p className="text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("id-ID")}
                      </p>
                      {row.meta !== null && typeof row.meta === "object" && (
                        <pre className="text-[10px] text-muted-foreground mt-1 overflow-x-auto">
                          {JSON.stringify(row.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
