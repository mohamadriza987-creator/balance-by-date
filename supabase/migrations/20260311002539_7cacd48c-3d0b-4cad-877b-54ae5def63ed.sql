
-- 1. Create family_messages table for family-wide messaging
CREATE TABLE public.family_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.family_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_user_id);

-- Users can see messages from anyone in their accepted family circle
CREATE POLICY "Users can view family messages"
ON public.family_messages
FOR SELECT TO authenticated
USING (
  sender_user_id = auth.uid()
  OR sender_user_id IN (
    SELECT fi.from_user_id FROM public.family_invitations fi
    WHERE fi.status = 'accepted'
    AND (
      (fi.identifier_type = 'email' AND fi.to_identifier = public.get_auth_email())
      OR (fi.identifier_type = 'finny_id' AND fi.to_identifier IN (SELECT p.finny_user_id FROM public.profiles p WHERE p.user_id = auth.uid()))
    )
  )
  OR sender_user_id IN (
    SELECT p2.user_id FROM public.family_invitations fi2
    JOIN public.profiles p2 ON (
      (fi2.identifier_type = 'email' AND fi2.to_identifier = (SELECT email FROM auth.users WHERE id = p2.user_id))
      OR (fi2.identifier_type = 'finny_id' AND fi2.to_identifier = p2.finny_user_id)
    )
    WHERE fi2.status = 'accepted' AND fi2.from_user_id = auth.uid()
  )
);

-- 2. Create a function to handle invitation acceptance (updates BOTH users' finance data)
CREATE OR REPLACE FUNCTION public.accept_family_invitation(
  invitation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  acceptor_profile record;
  sender_profile record;
  sender_finance jsonb;
  acceptor_finance jsonb;
  sender_members jsonb;
  new_member jsonb;
  rel_emojis jsonb := '{"spouse":"💍","child":"🧒","parent":"🧓","sibling":"🤝"}'::jsonb;
  reverse_rel text;
BEGIN
  -- Get the invitation
  SELECT * INTO inv FROM family_invitations WHERE id = invitation_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or already handled');
  END IF;

  -- Get acceptor (current user) profile
  SELECT user_id, first_name, last_name, finny_user_id INTO acceptor_profile
  FROM profiles WHERE user_id = auth.uid();

  -- Get sender profile
  SELECT user_id, first_name, last_name, finny_user_id INTO sender_profile
  FROM profiles WHERE user_id = inv.from_user_id;

  -- Determine reverse relationship
  reverse_rel := CASE inv.relationship
    WHEN 'parent' THEN 'child'
    WHEN 'child' THEN 'parent'
    ELSE inv.relationship
  END;

  -- Update invitation status
  UPDATE family_invitations SET status = 'accepted', updated_at = now() WHERE id = invitation_id;

  -- Update SENDER's finance_data to add acceptor as family member
  SELECT finance_data INTO sender_finance FROM user_finance_data WHERE user_id = inv.from_user_id;
  IF sender_finance IS NULL THEN sender_finance := '{}'::jsonb; END IF;
  
  sender_members := COALESCE(sender_finance->'familyData'->'members', '[]'::jsonb);
  new_member := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', COALESCE(NULLIF(CONCAT_WS(' ', acceptor_profile.first_name, acceptor_profile.last_name), ''), 'Family Member'),
    'relationship', reverse_rel,
    'emoji', COALESCE(rel_emojis->>reverse_rel, '👤'),
    'linkedUserId', acceptor_profile.user_id::text,
    'linkedFinnyId', COALESCE(acceptor_profile.finny_user_id, ''),
    'addedDate', to_char(now(), 'YYYY-MM-DD')
  );
  sender_members := sender_members || jsonb_build_array(new_member);

  -- Ensure familyData structure exists
  IF sender_finance->'familyData' IS NULL THEN
    sender_finance := sender_finance || jsonb_build_object('familyData', jsonb_build_object('members', '[]'::jsonb, 'requests', '[]'::jsonb, 'piggyBanks', '[]'::jsonb, 'sharedGoals', '[]'::jsonb));
  END IF;
  sender_finance := jsonb_set(sender_finance, '{familyData,members}', sender_members);
  
  UPDATE user_finance_data SET finance_data = sender_finance, updated_at = now() WHERE user_id = inv.from_user_id;

  -- If spouse, link profiles
  IF inv.relationship = 'spouse' THEN
    UPDATE profiles SET spouse_user_id = auth.uid() WHERE user_id = inv.from_user_id;
    UPDATE profiles SET spouse_user_id = inv.from_user_id WHERE user_id = auth.uid();
  END IF;

  -- Return sender info for the acceptor to add locally
  RETURN jsonb_build_object(
    'success', true,
    'sender_name', COALESCE(NULLIF(CONCAT_WS(' ', sender_profile.first_name, sender_profile.last_name), ''), 'Family Member'),
    'sender_user_id', sender_profile.user_id::text,
    'sender_finny_id', COALESCE(sender_profile.finny_user_id, ''),
    'relationship', inv.relationship
  );
END;
$$;
