
-- Family Circles table
CREATE TABLE public.family_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Family',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Family Circle Members table
CREATE TABLE public.family_circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'member',
  muted boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- Add circle_id to family_messages (nullable for backward compat)
ALTER TABLE public.family_messages ADD COLUMN circle_id uuid REFERENCES public.family_circles(id) ON DELETE CASCADE;

-- Security definer function to check circle membership without recursion
CREATE OR REPLACE FUNCTION public.is_circle_member(_user_id uuid, _circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_circle_members
    WHERE user_id = _user_id AND circle_id = _circle_id
  )
$$;

-- Enable RLS
ALTER TABLE public.family_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_circle_members ENABLE ROW LEVEL SECURITY;

-- RLS for family_circles: see circles you're a member of
CREATE POLICY "Users can view their circles"
  ON public.family_circles FOR SELECT TO authenticated
  USING (public.is_circle_member(auth.uid(), id));

CREATE POLICY "Users can create circles"
  ON public.family_circles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update circle"
  ON public.family_circles FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete circle"
  ON public.family_circles FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS for family_circle_members: see members in your circles
CREATE POLICY "Users can view circle members"
  ON public.family_circle_members FOR SELECT TO authenticated
  USING (public.is_circle_member(auth.uid(), circle_id));

CREATE POLICY "Circle members can add members"
  ON public.family_circle_members FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(auth.uid(), circle_id));

CREATE POLICY "Users can update own membership"
  ON public.family_circle_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave circles"
  ON public.family_circle_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update family_messages RLS to support circle-based messages
-- Drop existing policies that don't account for circle_id
DROP POLICY IF EXISTS "Users can view family messages" ON public.family_messages;

CREATE POLICY "Users can view family messages"
  ON public.family_messages FOR SELECT TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR (circle_id IS NOT NULL AND public.is_circle_member(auth.uid(), circle_id))
  );

-- Enable realtime for family_circles, family_circle_members, and family_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_circles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_circle_members;
