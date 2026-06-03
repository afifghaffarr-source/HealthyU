
CREATE TABLE public.friend_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_groups TO authenticated;
GRANT ALL ON public.friend_groups TO service_role;

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.friend_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_group_members TO authenticated;
GRANT ALL ON public.friend_group_members TO service_role;

ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of group?
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

-- friend_groups policies
CREATE POLICY "members can view group"
ON public.friend_groups FOR SELECT TO authenticated
USING (public.is_group_member(id, auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "owner can insert group"
ON public.friend_groups FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can delete group"
ON public.friend_groups FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "owner can update group"
ON public.friend_groups FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- friend_group_members policies
CREATE POLICY "members can view members"
ON public.friend_group_members FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "user can join group"
ON public.friend_group_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can leave group"
ON public.friend_group_members FOR DELETE TO authenticated
USING (user_id = auth.uid());
