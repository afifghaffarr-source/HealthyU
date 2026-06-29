import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPosts,
  createPost,
  deletePost,
  toggleLike,
} from "@/features/groups/lib/community.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Heart, Flame, Clock, Users } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { PostCard } from "@/features/groups/components/PostCard";
import { COMMUNITY_CATS, CommunityComposer } from "@/features/groups/components/CommunityComposer";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPosts);
  const create = useServerFn(createPost);
  const del = useServerFn(deletePost);
  const like = useServerFn(toggleLike);
  const { t } = useTranslation();

  const { data: posts = [] } = useQuery({ queryKey: ["community"], queryFn: () => list() });

  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [filter, setFilter] = useState<string>("all");

  const createMut = useMutation({
    mutationFn: () => create({ data: { content: content.trim(), category } }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["community"] });
      toast.success(t("community.posted"));
    },
    onError: (e) => toastError(e, "Gagal"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community"] }),
  });
  const likeMut = useMutation({
    mutationFn: (id: string) => like({ data: { post_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community"] }),
  });

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "hot">("new");

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const visiblePosts = useMemo(() => {
    const arr = [...filteredPosts];
    if (sort === "hot") {
      arr.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    } else {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return arr;
  }, [filteredPosts, sort]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: posts.length };
    for (const c of COMMUNITY_CATS) m[c.id] = posts.filter((p) => p.category === c.id).length;
    return m;
  }, [posts]);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title={t("community.title")} subtitle={t("community.subtitle")} showBack />

        <div className="grid grid-cols-3 gap-2">
          <Stat
            icon={<Users className="size-3.5" />}
            label={t("community.stats.posts")}
            value={posts.length}
          />
          <Stat
            icon={<Heart className="size-3.5" />}
            label={t("community.stats.likes")}
            value={posts.reduce((a, p) => a + (p.like_count ?? 0), 0)}
          />
          <Stat
            icon={<Flame className="size-3.5" />}
            label={t("community.stats.active")}
            value={
              // eslint-disable-next-line react-hooks/purity -- wall-clock / non-deterministic browser API; re-renders deliberately driven by interval/timer or event subscription
              posts.filter((p) => Date.now() - new Date(p.created_at).getTime() < 24 * 3600_000)
                .length
            }
          />
        </div>

        <CommunityComposer
          content={content}
          setContent={setContent}
          category={category}
          setCategory={setCategory}
          onSubmit={() => createMut.mutate()}
          submitting={createMut.isPending}
        />

        <section className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full bg-card outline-1 outline-black/10 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setSort("new")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition ${sort === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Clock className="size-3" /> {t("community.sort.newest")}
              </button>
              <button
                onClick={() => setSort("hot")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition ${sort === "hot" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Flame className="size-3" /> {t("community.sort.popular")}
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {visiblePosts.length} {t("community.postUnit")}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card outline-1 outline-black/10"
              }`}
            >
              {t("community.categoryAll")} <span className="opacity-70">· {counts.all}</span>
            </button>
            {COMMUNITY_CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  filter === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card outline-1 outline-black/10"
                }`}
              >
                {c.label} <span className="opacity-70">· {counts[c.id] ?? 0}</span>
              </button>
            ))}
          </div>
          {visiblePosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("community.empty")}</p>
          ) : (
            visiblePosts.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                commentsOpen={openComments === p.id}
                onToggleComments={() => setOpenComments(openComments === p.id ? null : p.id)}
                onLike={() => likeMut.mutate(p.id)}
                onDelete={() => delMut.mutate(p.id)}
              />
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card outline-1 outline-black/5 p-3">
      <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 text-lg font-black tabular-nums leading-none">{value}</p>
    </div>
  );
}
