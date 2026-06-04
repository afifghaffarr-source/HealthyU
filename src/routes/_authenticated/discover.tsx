import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { discoverUsers, searchUsers } from "@/lib/scanBatch7.functions";
import { Search, Flame, Users, X, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/healthyu/empty-state";
import { ListSkeleton } from "@/components/healthyu/skeletons";

export const Route = createFileRoute("/_authenticated/discover")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const discoverFn = useServerFn(discoverUsers);
  const searchFn = useServerFn(searchUsers);
  const { data: popular, isLoading: loadPop } = useQuery({
    queryKey: ["discover-users"],
    queryFn: () => discoverFn({ data: undefined as any }),
  });
  const { data: searchRes, isFetching: loadSearch } = useQuery({
    queryKey: ["search-users", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.length > 1,
  });
  const searching = q.length > 1;
  const users = searching ? searchRes?.users ?? [] : popular?.users ?? [];
  const loading = searching ? loadSearch : loadPop;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Discover" subtitle="Temukan teman seperjalanan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fade-up">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama user…"
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-card outline-1 outline-black/10 text-sm"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Bersihkan"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-7 rounded-full bg-muted grid place-items-center text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {searching ? <Search className="size-3" /> : <Sparkles className="size-3 text-primary" />}
          <span>{searching ? `Hasil "${q}"` : "Populer minggu ini"}</span>
          <span className="ml-auto tabular-nums normal-case text-muted-foreground/80">{users.length} user</span>
        </div>

        {loading && <ListSkeleton count={4} />}

        {!loading && users.length === 0 && (
          <EmptyState
            icon={Users}
            title={searching ? "Tidak ada user cocok" : "Belum ada user populer"}
            description={searching ? `Coba kata kunci lain selain "${q}".` : "Mulai berinteraksi untuk menemukan teman."}
          />
        )}

        <div className="space-y-2">
          {!loading && users.map((u: any, i: number) => (
            <Link
              key={u.id}
              to="/profile/public/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card outline-1 outline-black/5 hover:bg-muted/40 transition motion-safe:active:scale-[0.98]"
            >
              {!searching && i < 3 && (
                <span className={`shrink-0 size-7 rounded-full grid place-items-center text-[11px] font-black ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-zinc-100 text-zinc-700" : "bg-orange-100 text-orange-700"}`}>
                  {i + 1}
                </span>
              )}
              <div className="size-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 overflow-hidden grid place-items-center text-sm font-bold">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="size-full object-cover" /> : (u.full_name?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{u.full_name || "Tanpa nama"}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Flame className="size-3 text-orange-500" /> {u.scan_streak_current ?? 0} hari streak
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary">Lihat →</span>
            </Link>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}