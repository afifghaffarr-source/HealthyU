import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { EmptyState } from "@/components/healthyu/empty-state";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { LazyImage } from "@/components/healthyu/lazy-image";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { listArticles, toggleBookmark } from "@/lib/articles.functions";

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

  const articles = data?.articles ?? [];
  const bookmarks = new Set(data?.bookmarks ?? []);

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar title="Artikel Kesehatan" showBack />
      </div>
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {isLoading && <ListSkeleton count={3} />}
        {!isLoading && articles.length === 0 && (
          <EmptyState icon={BookOpen} title="Belum ada artikel" description="Artikel kesehatan baru akan muncul di sini." />
        )}
        {articles.map((a) => {
          const marked = bookmarks.has(a.id);
          return (
            <article key={a.id} className="rounded-3xl bg-card outline-1 outline-black/5 overflow-hidden shadow-sm">
              {a.image_url && (
                <LazyImage src={a.image_url} alt={a.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{a.category}</p>
                    <h2 className="font-semibold leading-tight mt-0.5">{a.title}</h2>
                  </div>
                  <button
                    onClick={() => bookmarkM.mutate(a.id)}
                    className="size-9 inline-flex items-center justify-center rounded-full bg-muted shrink-0"
                    aria-label="Bookmark"
                  >
                    {marked ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
                  </button>
                </div>
                {a.excerpt && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{a.excerpt}</p>}
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-3">
                  {a.reading_time_minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {a.reading_time_minutes} mnt
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