import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Calendar,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  listUsersAdmin,
  grantRoleAdmin,
  revokeRoleAdmin,
  type UserListItem,
} from "@/features/admin/lib/adminUsers.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

const PER_PAGE = 25;

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const [myUserId, setMyUserId] = useState<string | undefined>(undefined);

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

  const grantMut = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" | "user" }) =>
      grantRoleAdmin({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const revokeMut = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" | "user" }) =>
      revokeRoleAdmin({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 0;

  return (
    <div className="space-y-4 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Memuat…" : `${data?.total ?? 0} user terdaftar`}
        </p>
      </header>

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
              isMutating={grantMut.isPending || revokeMut.isPending}
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
    </div>
  );
}

function UserRow({
  u,
  myUserId,
  onGrant,
  onRevoke,
  isMutating,
}: {
  u: UserListItem;
  myUserId?: string;
  onGrant: (role: "admin" | "moderator" | "user") => void;
  onRevoke: (role: "admin" | "moderator" | "user") => void;
  isMutating: boolean;
}) {
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
      <div className="flex items-center gap-1 shrink-0">
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
