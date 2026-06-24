import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getPublicProfile } from "@/features/scan/lib/scanFinal.functions";
import { followUser, unfollowUser } from "@/features/scan/lib/scanSocial.functions";
import {
  getUserPosts,
  getUserCommunityStats,
} from "@/features/groups/lib/socialEnhanced.functions";
import { Flame, Trophy, UserPlus, UserMinus, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { UserPostsList } from "@/features/groups/components/UserPostsList";

export const Route = createFileRoute("/_authenticated/profile/public/$id")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/_authenticated/profile/public/$id" });
  const qc = useQueryClient();
  const fn = useServerFn(getPublicProfile);
  const postsFn = useServerFn(getUserPosts);
  const statsFn = useServerFn(getUserCommunityStats);
  const followFn = useServerFn(followUser);
  const unfollowFn = useServerFn(unfollowUser);
  const { data } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => fn({ data: { userId: id } }),
  });
  const { data: postsData } = useQuery({
    queryKey: ["user-posts", id],
    queryFn: () => postsFn({ data: { user_id: id, limit: 20 } }),
    enabled: !!id,
  });
  const { data: stats } = useQuery({
    queryKey: ["user-stats", id],
    queryFn: () => statsFn({ data: { user_id: id } }),
    enabled: !!id,
  });
  const followMut = useMutation({
    mutationFn: () =>
      data?.isFollowing
        ? unfollowFn({ data: { targetId: id } })
        : followFn({ data: { targetId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-profile", id] });
      qc.invalidateQueries({ queryKey: ["user-stats", id] });
    },
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
            <img
              loading="lazy"
              decoding="async"
              src={p.avatar_url}
              alt={`${p.full_name}'s avatar`}
              className="size-16 rounded-full"
            />
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

        {/* Community stats grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Posts" value={stats?.posts ?? 0} />
          <StatBox label="Reaksi" value={stats?.reactions_received ?? 0} />
          <StatBox label="Followers" value={stats?.followers ?? 0} />
          <StatBox label="Following" value={stats?.following ?? 0} />
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

        <div>
          <h3 className="text-sm font-semibold mb-2 inline-flex items-center gap-1">
            <MessageCircle className="size-4 text-primary" /> Posts
          </h3>
          <UserPostsList
            posts={
              (postsData as Array<{
                id: string;
                user_id: string;
                content: string;
                category: string;
                share_kind: string;
                share_metadata: Record<string, unknown>;
                created_at: string;
                reaction_count: number;
                my_reaction: string | null;
              }>) ?? []
            }
          />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card border p-3 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
