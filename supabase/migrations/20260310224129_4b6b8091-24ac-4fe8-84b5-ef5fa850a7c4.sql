
-- Create family_invitations table
CREATE TABLE public.family_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_identifier text NOT NULL,
  identifier_type text NOT NULL DEFAULT 'finny_id',
  relationship text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  from_first_name text,
  from_last_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert their own invitations
CREATE POLICY "Users can insert family invitations"
ON public.family_invitations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

-- RLS: Users can view invitations they sent or received
CREATE POLICY "Users can view family invitations"
ON public.family_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = from_user_id
  OR (identifier_type = 'finny_id' AND to_identifier IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (identifier_type = 'email' AND to_identifier IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);

-- RLS: Recipients can update (accept/decline) invitations sent to them
CREATE POLICY "Recipients can update family invitations"
ON public.family_invitations
FOR UPDATE
TO authenticated
USING (
  (identifier_type = 'finny_id' AND to_identifier IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (identifier_type = 'email' AND to_identifier IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);

-- Add updated_at trigger
CREATE TRIGGER update_family_invitations_updated_at
  BEFORE UPDATE ON public.family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Also allow reading profiles by finny_user_id for lookups (needed for invite flow)
CREATE POLICY "Authenticated users can lookup profiles by finny_user_id"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop old restrictive select policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
