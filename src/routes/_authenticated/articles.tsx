import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { EmptyState } from "@/components/healthyu/empty-state";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { LazyImage } from "@/components/healthyu/lazy-image";
import { toast } from "@/lib/toast-config";
import { BottomNav } from "@/components/bottom-nav";
import { listArticles, toggleBookmark } from "@/features/articles/lib/articles.functions";

export const Route = createFileRoute("/_authenticated/articles")({
  component: ArticlesPage,
});

function ArticlesPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listArticles);
  const toggleFn = useServerFn(toggleBookmark);

  const { data, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: () => fetchAll(),
  });

  const bookmarkM = useMutation({
    mutationFn: (article_id: string) => toggleFn({ data: { article_id } }),
    onSuccess: (r) => {
      toast.success(r.bookmarked ? "Disimpan" : "Bookmark dihapus");
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const articles = useMemo(() => data?.articles ?? [], [data]);
  const bookmarks = useMemo(() => new Set(data?.bookmarks ?? []), [data]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    articles.forEach((a) => {
      if (!a.category) return;
      map.set(a.category, (map.get(a.category) ?? 0) + 1);
    });
    return Array.from(map.entries());
    // AUDIT-007 fix: depend on `data` (source of truth) not the derived
    // `articles` ref — otherwise `categories` recomputes every render even
    // when the underlying array content is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const [filter, setFilter] = useState<string>("all");
  const visible =
    filter === "all"
      ? articles
      : filter === "bookmark"
        ? articles.filter((a) => bookmarks.has(a.id))
        : articles.filter((a) => a.category === filter);

  return (
    <div className="min-h-dvh pb-32">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar title="Artikel Kesehatan" showBack />
      </div>
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {!isLoading && articles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            <Chip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={articles.length}
            >
              Semua
            </Chip>
            <Chip
              active={filter === "bookmark"}
              onClick={() => setFilter("bookmark")}
              count={bookmarks.size}
            >
              ★ Disimpan
            </Chip>
            {categories.map(([c, n]) => (
              <Chip key={c} active={filter === c} onClick={() => setFilter(c)} count={n}>
                {c}
              </Chip>
            ))}
          </div>
        )}
        {isLoading && <ListSkeleton count={3} />}
        {!isLoading && articles.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Belum ada artikel"
            description="Artikel kesehatan baru akan muncul di sini."
          />
        )}
        {!isLoading && articles.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Tidak ada hasil"
            description="Coba pilih kategori lain."
          />
        )}
        {visible.map((a) => {
          const marked = bookmarks.has(a.id);
          return (
            <article
              key={a.id}
              className="rounded-3xl bg-card outline-1 outline-foreground/10 overflow-hidden shadow-sm"
            >
              {a.image_url && (
                <LazyImage src={a.image_url} alt={a.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      {a.category}
                    </p>
                    <Link
                      to="/articles/$id"
                      params={{ id: a.id }}
                      className="font-semibold leading-tight mt-0.5 hover:text-primary block"
                    >
                      {a.title}
                    </Link>
                  </div>
                  <button
                    onClick={() => bookmarkM.mutate(a.id)}
                    className="size-11 inline-flex items-center justify-center rounded-full bg-muted shrink-0 hover:bg-muted/70 transition"
                    aria-label={marked ? "Hapus bookmark" : "Simpan bookmark"}
                    aria-pressed={marked}
                  >
                    {marked ? (
                      <BookmarkCheck className="size-5 text-primary" />
                    ) : (
                      <Bookmark className="size-5" />
                    )}
                  </button>
                </div>
                {a.excerpt && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.excerpt}</p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground mt-3">
                  {a.reading_time_minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {a.reading_time_minutes} menit baca
                    </span>
                  )}
                  {a.author_name && <span>oleh {a.author_name}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-9 rounded-full text-xs font-semibold whitespace-nowrap transition ${
        active
          ? "bg-primary text-primary-foreground shadow"
          : "bg-card border border-border text-muted-foreground"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${active ? "bg-white/25" : "bg-muted"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
