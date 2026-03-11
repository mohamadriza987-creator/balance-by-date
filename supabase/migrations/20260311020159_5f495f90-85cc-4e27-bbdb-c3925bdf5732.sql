
-- The table and earlier parts already applied. Now fix the storage policy conflict and RLS policies.

-- Drop existing storage policy that conflicts
DROP POLICY IF EXISTS "Authenticated users can upload family media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view family media" ON storage.objects;

-- Recreate storage policies
CREATE POLICY "Authenticated users can upload family media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'family-media');

CREATE POLICY "Anyone can view family media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'family-media');

-- Make bucket public
UPDATE storage.buckets SET public = true WHERE id = 'family-media';

-- Fix RLS policies to be explicitly PERMISSIVE
DROP POLICY IF EXISTS "Users can create circles" ON public.family_circles;
DROP POLICY IF EXISTS "Users can view their circles" ON public.family_circles;
DROP POLICY IF EXISTS "Creator can update circle" ON public.family_circles;
DROP POLICY IF EXISTS "Creator can delete circle" ON public.family_circles;

CREATE POLICY "Users can create circles" ON public.family_circles AS PERMISSIVE
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view their circles" ON public.family_circles AS PERMISSIVE
  FOR SELECT TO authenticated USING (created_by = auth.uid() OR is_circle_member(auth.uid(), id));
CREATE POLICY "Creator can update circle" ON public.family_circles AS PERMISSIVE
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete circle" ON public.family_circles AS PERMISSIVE
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Circle members can add members" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can view circle members" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.family_circle_members;
DROP POLICY IF EXISTS "Users can leave circles" ON public.family_circle_members;

CREATE POLICY "Circle members can add members" ON public.family_circle_members AS PERMISSIVE
  FOR INSERT TO authenticated WITH CHECK (is_circle_member(auth.uid(), circle_id) OR auth.uid() = user_id);
CREATE POLICY "Users can view circle members" ON public.family_circle_members AS PERMISSIVE
  FOR SELECT TO authenticated USING (is_circle_member(auth.uid(), circle_id));
CREATE POLICY "Users can update own membership" ON public.family_circle_members AS PERMISSIVE
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can leave circles" ON public.family_circle_members AS PERMISSIVE
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own messages" ON public.family_messages;
DROP POLICY IF EXISTS "Users can view family messages" ON public.family_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.family_messages;
DROP POLICY IF EXISTS "Service role can delete expired messages" ON public.family_messages;

CREATE POLICY "Users can insert own messages" ON public.family_messages AS PERMISSIVE
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_user_id);
CREATE POLICY "Users can view family messages" ON public.family_messages AS PERMISSIVE
  FOR SELECT TO authenticated USING (sender_user_id = auth.uid() OR (circle_id IS NOT NULL AND is_circle_member(auth.uid(), circle_id)));
CREATE POLICY "Users can delete own messages" ON public.family_messages AS PERMISSIVE
  FOR DELETE TO authenticated USING (sender_user_id = auth.uid());
CREATE POLICY "Service role can delete expired messages" ON public.family_messages AS PERMISSIVE
  FOR DELETE TO service_role USING (true);
