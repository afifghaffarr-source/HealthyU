import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import {
  listComments,
  createComment,
  deleteComment,
} from "@/features/groups/lib/social.functions";
import { toastError } from "@/lib/toast-config";

export function PostComments({ postId }: { postId: string }) {
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
    onError: (e) => toastError(e, "Gagal"),
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