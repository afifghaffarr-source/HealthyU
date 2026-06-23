-- Sprint 8 — Community/Social enhancement (2026-06-23)
-- - community_posts: tambah share_kind (manual/streak/pr/meal_plan/fasting/workout_complete)
--   + share_metadata jsonb untuk data PR/streak/etc + reference_id
-- - community_likes: tambah reaction_type (heart/muscle/fire/clap/laugh), default 'heart'
--   Backward compat: existing rows become 'heart'
-- - notifications_log: index untuk unread count query

-- ====================================================================
-- community_posts: enhance for sharing achievements
-- ====================================================================
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS share_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (share_kind IN ('manual', 'streak', 'pr', 'meal_plan', 'fasting', 'workout_complete', 'goal')),
  ADD COLUMN IF NOT EXISTS share_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_id UUID,  -- link to PR/session/etc
  ADD COLUMN IF NOT EXISTS reaction_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_posts_user_created
  ON public.community_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_share_kind
  ON public.community_posts (share_kind, created_at DESC);

COMMENT ON COLUMN public.community_posts.share_kind IS
  'manual = free text post; streak/pr/meal_plan/etc = auto-shared achievement.';
COMMENT ON COLUMN public.community_posts.share_metadata IS
  'Flexible JSON for share data: e.g. {"exercise_name": "Squat", "weight_kg": 100, "reps": 5} for PR.';

-- ====================================================================
-- community_likes: support emoji reactions
-- ====================================================================
ALTER TABLE public.community_likes
  ADD COLUMN IF NOT EXISTS reaction_type TEXT NOT NULL DEFAULT 'heart'
    CHECK (reaction_type IN ('heart', 'muscle', 'fire', 'clap', 'laugh', 'star'));

-- Backfill reaction_count on posts based on current likes (one-time sync)
UPDATE public.community_posts p
SET reaction_count = COALESCE((
  SELECT COUNT(*) FROM public.community_likes l WHERE l.post_id = p.id
), 0);

-- Optional: drop the UNIQUE(post_id, user_id) constraint so user can change reaction type
-- (They'd otherwise need to delete then re-insert. Keep simple: UNIQUE on (post_id, user_id, reaction_type)).
-- Actually no — keep simple: one reaction per user per post (toggle). User can change type by update.

CREATE INDEX IF NOT EXISTS idx_community_likes_user
  ON public.community_likes (user_id, post_id);

COMMENT ON COLUMN public.community_likes.reaction_type IS
  'heart ❤️ | muscle 💪 | fire 🔥 | clap 👏 | laugh 😂 | star ⭐';

-- ====================================================================
-- notifications_log: index for unread + listing
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications_log (user_id, read, created_at DESC)
  WHERE read = false;

-- ====================================================================
-- Helper RPC: maintain reaction_count atomically on insert/delete
-- ====================================================================
CREATE OR REPLACE FUNCTION public.bump_reaction_count(p_post_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.community_posts
  SET reaction_count = GREATEST(0, reaction_count + p_delta)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.bump_reaction_count(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.bump_reaction_count IS
  'Atomic counter update for post reaction_count. Called from toggleLike server fn.';