/**
 * UserPostsList — posts by a specific user, with emoji reactions.
 * Used in /profile/public/$id.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Trophy, Flame, MessageCircle, Sparkles, Star, Dumbbell } from "lucide-react";
import { toggleReaction, getPostReactions } from "@/features/groups/lib/socialEnhanced.functions";
import { cn } from "@/lib/utils";

type UserPost = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  share_kind: string;
  share_metadata: Record<string, unknown>;
  created_at: string;
  reaction_count: number;
  my_reaction: string | null;
};

const REACTION_OPTIONS = [
  { type: "heart", emoji: "❤️", Icon: Heart },
  { type: "muscle", emoji: "💪", Icon: Dumbbell },
  { type: "fire", emoji: "🔥", Icon: Flame },
  { type: "clap", emoji: "👏", Icon: Sparkles },
  { type: "star", emoji: "⭐", Icon: Star },
];

const SHARE_KIND_ICON: Record<string, { Icon: typeof Trophy; color: string }> = {
  pr: { Icon: Trophy, color: "text-amber-500" },
  streak: { Icon: Flame, color: "text-orange-500" },
  meal_plan: { Icon: Sparkles, color: "text-emerald-500" },
  fasting: { Icon: Sparkles, color: "text-indigo-500" },
  workout_complete: { Icon: Dumbbell, color: "text-blue-500" },
  manual: { Icon: MessageCircle, color: "text-muted-foreground" },
  goal: { Icon: Trophy, color: "text-amber-500" },
};

export function UserPostsList({ posts }: { posts: UserPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-3xl p-6 text-center outline-1 outline-black/5">
        <MessageCircle className="size-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Belum ada post</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

function PostCard({ post }: { post: UserPost }) {
  const [openPicker, setOpenPicker] = useState(false);
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleReaction);

  const toggleMut = useMutation({
    mutationFn: (reaction_type: string) => toggleFn({ data: { post_id: post.id, reaction_type } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
      setOpenPicker(false);
    },
  });

  const meta = SHARE_KIND_ICON[post.share_kind] ?? SHARE_KIND_ICON.manual;
  const Icon = meta.Icon;

  return (
    <div className="bg-card rounded-2xl p-3 outline-1 outline-black/5 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
        {post.share_kind !== "manual" && (
          <span className={`inline-flex items-center gap-0.5 ${meta.color}`}>
            <Icon className="size-3" />
            {post.share_kind.replace("_", " ")}
          </span>
        )}
        <span className="text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{post.content}</p>

      {/* Reaction picker + count */}
      <div className="flex items-center gap-2 pt-1 relative">
        <button
          onClick={() => setOpenPicker((o) => !o)}
          disabled={toggleMut.isPending}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition active:scale-95",
            post.my_reaction
              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {post.my_reaction
            ? (REACTION_OPTIONS.find((r) => r.type === post.my_reaction)?.emoji ?? "❤️")
            : "🤍"}
          <span className="tabular-nums">{post.reaction_count}</span>
        </button>
        {post.share_kind !== "manual" && (
          <span className="text-[10px] text-muted-foreground">
            {String(post.share_metadata?.exercise_name ?? post.share_metadata?.days ?? "")}
          </span>
        )}

        {openPicker && (
          <div
            className="absolute bottom-full left-0 mb-1 bg-card rounded-full px-1.5 py-1 outline-1 outline-black/10 flex gap-0.5 animate-fade-up z-10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {REACTION_OPTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => toggleMut.mutate(r.type)}
                disabled={toggleMut.isPending}
                className="size-8 grid place-items-center hover:scale-125 transition text-lg"
                title={r.type}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
