import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Eye, EyeOff, ExternalLink, Clock, Loader2, Newspaper } from "lucide-react";
import {
  listArticlesAdmin,
  toggleArticlePublish,
  type ArticleListItem,
} from "@/features/admin/lib/adminArticles.functions";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  component: AdminArticlesPage,
});

function AdminArticlesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const updateSearch = (v: string) => {
    setSearch(v);
    setTimeout(() => setDebouncedSearch(v), 300);
  };

  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "articles", debouncedSearch],
    queryFn: () =>
      listArticlesAdmin({ data: { search: debouncedSearch || undefined, limit: 100 } }),
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; isPublished: boolean }) =>
      toggleArticlePublish({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold">Articles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Memuat…" : `${data?.total ?? 0} artikel`}
        </p>
      </header>

      <div className="flex items-center gap-2 bg-card rounded-2xl p-3 outline-1 outline-black/5">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input
          type="search"
          placeholder="Cari judul, slug…"
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm py-2"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive font-mono">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <Newspaper className="size-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground">Tidak ada artikel.</p>
        </div>
      ) : data ? (
        <div className="space-y-2">
          {data.items.map((a) => (
            <ArticleRow
              key={a.id}
              a={a}
              onToggle={() => toggleMut.mutate({ id: a.id, isPublished: !a.is_published })}
              isMutating={toggleMut.isPending}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ArticleRow({
  a,
  onToggle,
  isMutating,
}: {
  a: ArticleListItem;
  onToggle: () => void;
  isMutating: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl p-4 outline-1 outline-black/5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm line-clamp-1">{a.title}</p>
          {a.is_published ? (
            <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              Published
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              Draft
            </span>
          )}
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground capitalize">
            {a.category ?? "—"}
          </span>
        </div>
        {a.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{a.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="font-mono">/{a.slug}</span>
          {a.reading_time_minutes && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {a.reading_time_minutes} min
            </span>
          )}
          {Number(a.view_count ?? 0) > 0 && <span>👁 {a.view_count} views</span>}
          {a.author_name && <span>by {a.author_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          to="/artikel/$slug"
          params={{ slug: a.slug }}
          target="_blank"
          rel="noopener"
          className="p-1.5 rounded-lg hover:bg-muted"
          title="Lihat publik"
        >
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </Link>
        <button
          onClick={onToggle}
          disabled={isMutating}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
          title={a.is_published ? "Unpublish" : "Publish"}
        >
          {isMutating ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : a.is_published ? (
            <EyeOff className="size-3.5 text-muted-foreground" />
          ) : (
            <Eye className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
