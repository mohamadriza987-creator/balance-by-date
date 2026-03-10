CREATE TABLE public.spouse_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_finny_user_id text,
  to_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.spouse_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own invitations"
ON public.spouse_invitations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view their own invitations"
ON public.spouse_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = from_user_id 
  OR to_finny_user_id IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR to_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update invitations sent to them"
ON public.spouse_invitations
FOR UPDATE
TO authenticated
USING (
  to_finny_user_id IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR to_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Add spouse_user_id to profiles for linked spouses
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spouse_user_id uuid;

-- Trigger to update updated_at
CREATE TRIGGER update_spouse_invitations_updated_at
  BEFORE UPDATE ON public.spouse_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();