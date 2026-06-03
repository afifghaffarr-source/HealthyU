import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { discoverUsers, searchUsers } from "@/lib/scanBatch7.functions";
import { Search, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/discover")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const discoverFn = useServerFn(discoverUsers);
  const searchFn = useServerFn(searchUsers);
  const { data: popular } = useQuery({
    queryKey: ["discover-users"],
    queryFn: () => discoverFn({ data: undefined as any }),
  });
  const { data: searchRes } = useQuery({
    queryKey: ["search-users", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.length > 1,
  });
  const users = q.length > 1 ? searchRes?.users ?? [] : popular?.users ?? [];
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Discover" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari user..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border"
          />
        </div>
        {users.map((u: any) => (
          <Link
            key={u.id}
            to="/profile/public/$id"
            params={{ id: u.id }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border"
          >
            <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-sm">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="size-full object-cover" /> : (u.full_name?.[0] ?? "?")}
            </div>
            <div className="flex-1">
              <div className="font-medium">{u.full_name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="size-3" /> {u.scan_streak_current ?? 0} streak
              </div>
            </div>
          </Link>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Tidak ada user.</p>}
      </main>
      <BottomNav />
    </div>
  );
}