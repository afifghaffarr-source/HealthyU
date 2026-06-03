
-- community_posts extend
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'progress_update',
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- community_comments extend
ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- articles
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  content_html TEXT,
  image_url TEXT,
  audio_url TEXT,
  video_url TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  author_name TEXT,
  author_title TEXT,
  author_avatar_url TEXT,
  author_user_id UUID,
  source_name TEXT,
  source_url TEXT,
  is_original BOOLEAN NOT NULL DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER,
  target_conditions JSONB DEFAULT '[]'::jsonb,
  target_goals JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'id',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles public read" ON public.articles FOR SELECT USING (is_published AND deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_articles_cat ON public.articles(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING GIN(tags);
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- article_bookmarks
CREATE TABLE IF NOT EXISTS public.article_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_bookmarks TO authenticated;
GRANT ALL ON public.article_bookmarks TO service_role;
ALTER TABLE public.article_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks all" ON public.article_bookmarks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- community_groups (public discoverable groups, distinct from private friend_groups)
CREATE TABLE IF NOT EXISTS public.community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_groups TO authenticated;
GRANT ALL ON public.community_groups TO service_role;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups public read" ON public.community_groups FOR SELECT USING (is_public OR created_by = auth.uid());
CREATE POLICY "owner insert group" ON public.community_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner update group" ON public.community_groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "owner delete group" ON public.community_groups FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE TRIGGER trg_cg_updated BEFORE UPDATE ON public.community_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- group_members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view" ON public.group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_groups g WHERE g.id = group_id AND (g.is_public OR g.created_by = auth.uid())) OR user_id = auth.uid());
CREATE POLICY "self join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "self leave" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid());
