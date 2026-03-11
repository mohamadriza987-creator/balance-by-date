
-- Step 1: Create security definer function to get current user's email safely
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Step 2: Drop and recreate family_invitations RLS policies that reference auth.users
DROP POLICY IF EXISTS "Users can view family invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Recipients can update family invitations" ON public.family_invitations;

CREATE POLICY "Users can view family invitations"
ON public.family_invitations
FOR SELECT
TO authenticated
USING (
  (auth.uid() = from_user_id)
  OR (identifier_type = 'finny_id' AND to_identifier IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (identifier_type = 'email' AND to_identifier = public.get_auth_email())
);

CREATE POLICY "Recipients can update family invitations"
ON public.family_invitations
FOR UPDATE
TO authenticated
USING (
  (identifier_type = 'finny_id' AND to_identifier IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (identifier_type = 'email' AND to_identifier = public.get_auth_email())
);

-- Step 3: Fix spouse_invitations RLS policies too
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.spouse_invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to them" ON public.spouse_invitations;

CREATE POLICY "Users can view their own invitations"
ON public.spouse_invitations
FOR SELECT
TO authenticated
USING (
  (auth.uid() = from_user_id)
  OR (to_finny_user_id IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (to_email = public.get_auth_email())
);

CREATE POLICY "Users can update invitations sent to them"
ON public.spouse_invitations
FOR UPDATE
TO authenticated
USING (
  (to_finny_user_id IN (
    SELECT finny_user_id FROM public.profiles WHERE user_id = auth.uid()
  ))
  OR (to_email = public.get_auth_email())
);
