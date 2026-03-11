
-- Drop all existing restrictive policies on family_circles
DROP POLICY IF EXISTS "Users can create circles" ON public.family_circles;
DROP POLICY IF EXISTS "Users can view their circles" ON public.family_circles;
DROP POLICY IF EXISTS "Creator can update circle" ON public.family_circles;
DROP POLICY IF EXISTS "Creator can delete circle" ON public.family_circles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can create circles" ON public.family_circles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their circles" ON public.family_circles
  FOR SELECT TO authenticated USING (created_by = auth.uid() OR is_circle_member(auth.uid(), id));

CREATE POLICY "Creator can update circle" ON public.family_circles
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete circle" ON public.family_circles
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Drop all existing restrictive policies on family_circle_members
DROP POLICY IF EXISTS "Circle members can add members" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can view circle members" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can leave circles" ON public.family_circle_members;

-- Recreate as PERMISSIVE
CREATE POLICY "Circle members can add members" ON public.family_circle_members
  FOR INSERT TO authenticated WITH CHECK (is_circle_member(auth.uid(), circle_id) OR auth.uid() = user_id);

CREATE POLICY "Users can view circle members" ON public.family_circle_members
  FOR SELECT TO authenticated USING (is_circle_member(auth.uid(), circle_id));

CREATE POLICY "Users can update own membership" ON public.family_circle_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can leave circles" ON public.family_circle_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Drop all existing restrictive policies on family_messages
DROP POLICY IF EXISTS "Users can insert own messages" ON public.family_messages;
DROP POLICY IF EXISTS "Users can view family messages" ON public.family_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.family_messages;
DROP POLICY IF EXISTS "Service role can delete expired messages" ON public.family_messages;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can insert own messages" ON public.family_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can view family messages" ON public.family_messages
  FOR SELECT TO authenticated USING (sender_user_id = auth.uid() OR (circle_id IS NOT NULL AND is_circle_member(auth.uid(), circle_id)));

CREATE POLICY "Users can delete own messages" ON public.family_messages
  FOR DELETE TO authenticated USING (sender_user_id = auth.uid());

CREATE POLICY "Service role can delete expired messages" ON public.family_messages
  FOR DELETE TO service_role USING (true);
