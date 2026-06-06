import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import {
  commentOnStory,
  listStoryComments,
  toggleStoryLike,
} from "@/features/scan/lib/scanFinal.functions";
import { Heart, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stories/$id")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/_authenticated/stories/$id" });
  const qc = useQueryClient();
  const listFn = useServerFn(listStoryComments);
  const commentFn = useServerFn(commentOnStory);
  const likeFn = useServerFn(toggleStoryLike);
  const [body, setBody] = useState("");
  const { data } = useQuery({
    queryKey: ["story-comments", id],
    queryFn: () => listFn({ data: { storyId: id } }),
  });
  const commentMut = useMutation({
    mutationFn: () => commentFn({ data: { storyId: id, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["story-comments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { storyId: id } }),
    onSuccess: (r) => toast.success(r.liked ? "Disukai" : "Like dihapus"),
  });
  return (
    <div className="min-h-dvh pb-32 bg-background">
      <TopAppBar title="Story" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <button
          onClick={() => likeMut.mutate()}
          className="rounded-xl border px-3 py-2 text-sm inline-flex items-center gap-2"
        >
          <Heart className="size-4 text-red-500" /> Like
        </button>
        {data?.comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border p-3">
            <div className="text-xs text-muted-foreground">{c.profiles?.full_name}</div>
            <p className="text-sm">{c.body}</p>
          </div>
        ))}
      </main>
      <div className="fixed bottom-20 inset-x-0 px-4">
        <div className="max-w-md mx-auto flex gap-2 bg-card border rounded-2xl p-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Komentar…"
            className="flex-1 bg-transparent px-2 outline-none text-sm"
            maxLength={500}
          />
          <button
            onClick={() => commentMut.mutate()}
            disabled={commentMut.isPending || !body.trim()}
            className="rounded-xl bg-primary text-primary-foreground px-3 py-2"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
