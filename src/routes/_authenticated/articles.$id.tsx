import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, BookmarkCheck, Clock, Share2 } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { TakeawayBox } from "@/components/healthyu/takeaway-box";
import { DisclaimerCard } from "@/components/healthyu/disclaimer-card";
import { CardSkeleton, ListSkeleton } from "@/components/healthyu/skeletons";
import { LazyImage } from "@/components/healthyu/lazy-image";
import { EmptyState } from "@/components/healthyu/empty-state";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getArticle, toggleBookmark } from "@/features/articles/lib/articles.functions";

export const Route = createFileRoute("/_authenticated/articles/$id")({
  component: ArticleReader,
});

function ArticleReader() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchArticle = useServerFn(getArticle);
  const toggleFn = useServerFn(toggleBookmark);
  const [progress, setProgress] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["article", id],
    queryFn: () => fetchArticle({ data: { id } }),
  });

  const saved = data?.bookmarked ?? false;
  const article = data?.article;
  const related = data?.related ?? [];

  const bookmarkM = useMutation({
    mutationFn: () => toggleFn({ data: { article_id: id } }),
    onSuccess: (r) => {
      toast.success(r.bookmarked ? "Disimpan" : "Bookmark dihapus");
      qc.invalidateQueries({ queryKey: ["article", id] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const share = async () => {
    const payload = {
      title: article?.title ?? "Artikel HealthyU",
      text: "Baca artikel sehat ini di HealthyU",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch {}
    } else {
      await navigator.clipboard.writeText(payload.url);
      toast.success("Link disalin");
    }
  };

  const minutes = article?.reading_time_minutes ?? null;
  return (
    <div className="min-h-dvh pb-28 px-4">
      <div className="fixed top-0 inset-x-0 z-40 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <TopAppBar
        title="Artikel"
        subtitle={minutes ? `${minutes} menit baca` : undefined}
        showBack
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={share}
              aria-label="Bagikan"
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted transition"
            >
              <Share2 className="size-5" aria-hidden />
            </button>
            <button
              onClick={() => bookmarkM.mutate()}
              disabled={bookmarkM.isPending || isLoading}
              aria-label={saved ? "Hapus bookmark" : "Simpan bookmark"}
              aria-pressed={saved}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted transition disabled:opacity-50"
            >
              {saved ? (
                <BookmarkCheck className="size-5 text-primary" aria-hidden />
              ) : (
                <Bookmark className="size-5" aria-hidden />
              )}
            </button>
          </div>
        }
      />

      {isLoading && (
        <div className="mt-4 space-y-4">
          <CardSkeleton className="h-44" />
          <ListSkeleton count={3} />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={BookOpen}
          title="Artikel tidak bisa dimuat"
          description="Cek koneksi lalu coba lagi."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Coba lagi
            </button>
          }
        />
      )}

      {!isLoading && !isError && !article && (
        <EmptyState
          icon={BookOpen}
          title="Artikel tidak ditemukan"
          description="Artikel ini mungkin sudah tidak tersedia."
        />
      )}

      {article && (
        <>
          {article.image_url && (
            <div className="mt-4 rounded-3xl overflow-hidden aspect-[16/9] bg-muted">
              <LazyImage
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <header className="mt-4 space-y-2">
            {article.category && (
              <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                {article.category}
              </p>
            )}
            <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {article.author_name && <span>oleh {article.author_name}</span>}
              {minutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden /> {minutes} menit baca
                </span>
              )}
            </div>
            {article.excerpt && (
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                {article.excerpt}
              </p>
            )}
          </header>

          <article className="prose prose-sm dark:prose-invert max-w-none mt-5 prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-img:rounded-2xl">
            {article.content_html ? (
              <div dangerouslySetInnerHTML={{ __html: article.content_html }} />
            ) : article.content ? (
              article.content.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
            ) : (
              <p className="text-muted-foreground">Konten artikel belum tersedia.</p>
            )}
          </article>

          <div className="mt-6 space-y-3">
            <TakeawayBox body="Coba hari ini: pilih satu ide praktis dari artikel ini, terapkan di makan berikutnya." />
            <DisclaimerCard />
          </div>

          {related.length > 0 && (
            <section className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Artikel terkait
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to="/articles/$id"
                    params={{ id: r.id }}
                    className="rounded-2xl bg-card outline-1 outline-foreground/10 overflow-hidden active:scale-[0.98] transition"
                  >
                    {r.image_url && (
                      <div className="aspect-[16/10] bg-muted">
                        <LazyImage
                          src={r.image_url}
                          alt={r.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-semibold leading-snug line-clamp-2">
                        {r.title}
                      </p>
                      {r.reading_time_minutes && (
                        <p className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="size-3" aria-hidden /> {r.reading_time_minutes} mnt
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <BottomNav />
    </div>
  );
}
