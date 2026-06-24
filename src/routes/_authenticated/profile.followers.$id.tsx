import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listFollowers } from "@/features/scan/lib/scanBatch7.functions";

export const Route = createFileRoute("/_authenticated/profile/followers/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<"followers" | "following">("followers");
  const fn = useServerFn(listFollowers);
  const { data } = useQuery({
    queryKey: ["followers", id],
    queryFn: () => fn({ data: { userId: id } }),
  });
  const list = tab === "followers" ? (data?.followers ?? []) : (data?.following ?? []);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Followers" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("followers")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "followers" ? "bg-primary text-primary-foreground" : "border"}`}
          >
            Followers ({data?.followers.length ?? 0})
          </button>
          <button
            onClick={() => setTab("following")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "following" ? "bg-primary text-primary-foreground" : "border"}`}
          >
            Following ({data?.following.length ?? 0})
          </button>
        </div>
        <div className="space-y-2">
          {list.map((u) => (
            <Link
              key={u.id}
              to="/profile/public/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border"
            >
              <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-sm">
                {u.avatar_url ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={u.avatar_url}
                    alt={`${u.full_name}'s avatar`}
                    className="size-full object-cover"
                  />
                ) : (
                  (u.full_name?.[0] ?? "?")
                )}
              </div>
              <span className="font-medium">{u.full_name}</span>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Kosong</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
