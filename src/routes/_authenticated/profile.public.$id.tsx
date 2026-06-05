import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getPublicProfile } from "@/lib/scanFinal.functions";
import { followUser, unfollowUser } from "@/lib/scanSocial.functions";
import { Flame, Trophy, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/public/$id")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/_authenticated/profile/public/$id" });
  const qc = useQueryClient();
  const fn = useServerFn(getPublicProfile);
  const followFn = useServerFn(followUser);
  const unfollowFn = useServerFn(unfollowUser);
  const { data } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => fn({ data: { userId: id } }),
  });
  const followMut = useMutation({
    mutationFn: () =>
      data?.isFollowing
        ? unfollowFn({ data: { targetId: id } })
        : followFn({ data: { targetId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-profile", id] }),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return <div className="p-8 text-center text-sm text-muted-foreground">Memuat…</div>;
  const p = data.profile;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={p.full_name ?? "Profil"} showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-card border p-4">
          {p.avatar_url ? (
            <img loading="lazy" decoding="async" src={p.avatar_url} alt="" className="size-16 rounded-full" />
          ) : (
            <div className="size-16 rounded-full bg-muted" />
          )}
          <div className="flex-1">
            <div className="font-bold">{p.full_name}</div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Flame className="size-3 text-orange-500" /> streak {p.scan_streak_current ?? 0} hari
              · best {p.scan_streak_longest ?? 0}
            </div>
          </div>
          <button
            onClick={() => followMut.mutate()}
            disabled={followMut.isPending}
            className={`rounded-xl px-3 py-2 text-xs font-medium inline-flex items-center gap-1 ${
              data.isFollowing ? "border" : "bg-primary text-primary-foreground"
            }`}
          >
            {data.isFollowing ? <UserMinus className="size-3" /> : <UserPlus className="size-3" />}
            {data.isFollowing ? "Unfollow" : "Follow"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border p-3 text-center">
            <div className="text-2xl font-bold">{data.followers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="rounded-2xl bg-card border p-3 text-center">
            <div className="text-2xl font-bold">{data.following}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2 inline-flex items-center gap-1">
            <Trophy className="size-4 text-yellow-500" /> Achievements
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {data.achievements.map((a) => (
              <div key={a.achievement_id} className="rounded-xl bg-card border p-2 text-center">
                <div className="text-2xl">{a.achievements?.icon ?? "🏆"}</div>
                <div className="text-[10px] mt-1">{a.achievements?.title}</div>
              </div>
            ))}
            {data.achievements.length === 0 && (
              <p className="col-span-4 text-xs text-muted-foreground text-center py-4">Belum ada</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
