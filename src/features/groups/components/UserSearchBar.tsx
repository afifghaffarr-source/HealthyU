/**
 * UserSearchBar — discover users by name.
 * Shows follow/unfollow button per result.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, UserPlus, UserMinus, Loader2, Flame } from "lucide-react";
import { searchUsers } from "@/features/groups/lib/socialEnhanced.functions";
import { followUser, unfollowUser } from "@/features/scan/lib/scanSocial.functions";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { toastError } from "@/lib/toast-config";

type SearchResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  scan_streak_current: number | null;
  is_following: boolean;
};

export function UserSearchBar() {
  const [q, setQ] = useState("");
  const fn = useServerFn(searchUsers);
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["users", "search", q],
    queryFn: () => fn({ data: { q } }),
    enabled: q.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama user..."
          className="w-full bg-card pl-10 pr-4 py-3 rounded-2xl outline-1 outline-black/5 text-sm focus:outline-2 focus:outline-primary"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {q.trim().length < 2 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Ketik minimal 2 huruf untuk mencari
        </p>
      ) : results.length === 0 && !isFetching ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Tidak ada user dengan nama "{q}"
        </p>
      ) : (
        <div className="space-y-2">
          {(results as SearchResult[]).map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: SearchResult }) {
  const qc = useQueryClient();
  const followFn = useServerFn(followUser);
  const unfollowFn = useServerFn(unfollowUser);

  const followMut = useMutation({
    mutationFn: () =>
      user.is_following
        ? unfollowFn({ data: { targetId: user.id } })
        : followFn({ data: { targetId: user.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users", "search"] }),
    onError: (e: Error) => toastError(e, "Gagal"),
  });

  return (
    <div className="bg-card rounded-2xl p-3 outline-1 outline-black/5 flex items-center gap-3">
      <Link
        to="/profile/public/$id"
        params={{ id: user.id }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {user.avatar_url ? (
          <img
            loading="lazy"
            decoding="async"
            src={user.avatar_url}
            alt=""
            className="size-10 rounded-full"
          />
        ) : (
          <div className="size-10 rounded-full bg-primary/10 grid place-items-center text-primary font-bold text-sm">
            {(user.full_name ?? "U").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.full_name ?? "User"}</p>
          {(user.scan_streak_current ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Flame className="size-3 text-orange-500" />
              {user.scan_streak_current} hari streak
            </p>
          )}
        </div>
      </Link>
      <button
        onClick={() => followMut.mutate()}
        disabled={followMut.isPending}
        className={cn(
          "size-9 rounded-full grid place-items-center active:scale-95 transition disabled:opacity-60",
          user.is_following
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-label={user.is_following ? "Unfollow" : "Follow"}
      >
        {user.is_following ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
      </button>
    </div>
  );
}
