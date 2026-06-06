import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { PostComments } from "./PostComments";

type Post = {
  id: string;
  author: string;
  created_at: string;
  category: string;
  content: string;
  is_mine?: boolean;
  liked_by_me?: boolean;
  like_count: number;
};

export function PostCard({
  p,
  commentsOpen,
  onToggleComments,
  onLike,
  onDelete,
}: {
  p: Post;
  commentsOpen: boolean;
  onToggleComments: () => void;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
          {p.author.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{p.author}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(p.created_at).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            <span className="text-primary capitalize">{p.category}</span>
          </p>
        </div>
        {p.is_mine && (
          <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.content}</p>
      <div className="flex gap-4 mt-3 items-center">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-xs font-semibold ${
            p.liked_by_me ? "text-coral" : "text-muted-foreground"
          }`}
        >
          <Heart className={`size-4 ${p.liked_by_me ? "fill-coral" : ""}`} />
          {p.like_count}
        </button>
        <button
          onClick={onToggleComments}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <MessageCircle className="size-4" /> Komentar
        </button>
      </div>
      {commentsOpen && <PostComments postId={p.id} />}
    </article>
  );
}
