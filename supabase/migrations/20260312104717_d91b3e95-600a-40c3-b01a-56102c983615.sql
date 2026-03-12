
-- Create the family_circle_invitations table
CREATE TABLE public.family_circle_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(circle_id, from_user_id, to_user_id, status)
);

ALTER TABLE public.family_circle_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations sent to them or by them
CREATE POLICY "Users can view circle invitations"
  ON public.family_circle_invitations FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Circle members can send invitations
CREATE POLICY "Members can send circle invitations"
  ON public.family_circle_invitations FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Recipients can update (accept/decline) invitations
CREATE POLICY "Recipients can update circle invitations"
  ON public.family_circle_invitations FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_circle_invitations;
