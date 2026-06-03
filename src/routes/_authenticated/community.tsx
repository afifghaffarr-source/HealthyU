import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPosts, createPost, deletePost, toggleLike } from "@/lib/community.functions";
import { listComments, createComment, deleteComment } from "@/lib/social.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Heart, Trash2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

const CATS = [
  { id: "general", label: "Umum" },
  { id: "diet", label: "Diet" },
  { id: "fasting", label: "Puasa" },
  { id: "workout", label: "Latihan" },
  { id: "motivation", label: "Motivasi" },
] as const;

function CommunityPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPosts);
  const create = useServerFn(createPost);
  const del = useServerFn(deletePost);
  const like = useServerFn(toggleLike);

  const { data: posts = [] } = useQuery({ queryKey: ["community"], queryFn: () => list() });

  const [content, setContent] = useState("");
  const [category, setCategory] = useState<(typeof CATS)[number]["id"]>("general");
  const [filter, setFilter] = useState<"all" | (typeof CATS)[number]["id"]>("all");

  const createMut = useMutation({
    mutationFn: () => create({ data: { content: content.trim(), category } }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["community"] });
      toast.success("Posting terkirim");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
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

  const visiblePosts = filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Komunitas</h1>
            <p className="text-xs text-muted-foreground">Berbagi tips & dukungan</p>
          </div>
        </header>

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 1000))}
            placeholder="Apa yang ingin kamu bagikan?"
            rows={3}
            className="w-full bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm resize-none"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  category === c.id ? "bg-primary text-primary-foreground" : "bg-mint text-sage-deep"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => createMut.mutate()}
            disabled={!content.trim() || createMut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
          >
            <Send className="size-4" /> Kirim
          </button>
        </section>

        <section className="space-y-3 animate-fade-up">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"
              }`}
            >
              Semua
            </button>
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  filter === c.id ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {visiblePosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada postingan. Jadilah yang pertama!</p>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
                    {p.author.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.author}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      <span className="text-primary capitalize">{p.category}</span>
                    </p>
                  </div>
                  {p.is_mine && (
                    <button onClick={() => delMut.mutate(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.content}</p>
                <div className="flex gap-4 mt-3 items-center">
                  <button
                    onClick={() => likeMut.mutate(p.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      p.liked_by_me ? "text-coral" : "text-muted-foreground"
                    }`}
                  >
                    <Heart className={`size-4 ${p.liked_by_me ? "fill-coral" : ""}`} />
                    {p.like_count}
                  </button>
                  <button
                    onClick={() => setOpenComments(openComments === p.id ? null : p.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <MessageCircle className="size-4" /> Komentar
                  </button>
                </div>
                {openComments === p.id && <Comments postId={p.id} />}
              </article>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Comments({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listComments);
  const create = useServerFn(createComment);
  const del = useServerFn(deleteComment);
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => list({ data: { post_id: postId } }),
  });
  const [text, setText] = useState("");
  const createMut = useMutation({
    mutationFn: () => create({ data: { post_id: postId, content: text.trim() } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", postId] }),
  });
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-xs">
          <div className="size-7 rounded-full bg-mint text-sage-deep grid place-items-center text-[10px] font-bold shrink-0">
            {c.author.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 bg-background rounded-2xl px-3 py-2">
            <p className="font-semibold">{c.author}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
          </div>
          {c.is_mine && (
            <button onClick={() => delMut.mutate(c.id)} className="p-1 text-muted-foreground">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Tulis komentar..."
          className="flex-1 bg-background outline-1 outline-black/10 rounded-2xl px-3 py-2 text-xs"
        />
        <button
          onClick={() => createMut.mutate()}
          disabled={!text.trim() || createMut.isPending}
          className="px-3 bg-primary text-primary-foreground rounded-2xl text-xs font-semibold disabled:opacity-50"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}