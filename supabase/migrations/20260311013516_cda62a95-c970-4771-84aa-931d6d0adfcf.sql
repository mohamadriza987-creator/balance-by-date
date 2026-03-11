
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE for family_circles
DROP POLICY IF EXISTS "Users can create circles" ON public.family_circles;
CREATE POLICY "Users can create circles" ON public.family_circles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view their circles" ON public.family_circles;
CREATE POLICY "Users can view their circles" ON public.family_circles
  FOR SELECT TO authenticated
  USING (is_circle_member(auth.uid(), id));

DROP POLICY IF EXISTS "Creator can update circle" ON public.family_circles;
CREATE POLICY "Creator can update circle" ON public.family_circles
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator can delete circle" ON public.family_circles;
CREATE POLICY "Creator can delete circle" ON public.family_circles
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Fix family_circle_members policies
DROP POLICY IF EXISTS "Circle members can add members" ON public.family_circle_members;
CREATE POLICY "Circle members can add members" ON public.family_circle_members
  FOR INSERT TO authenticated
  WITH CHECK (is_circle_member(auth.uid(), circle_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view circle members" ON public.family_circle_members;
CREATE POLICY "Users can view circle members" ON public.family_circle_members
  FOR SELECT TO authenticated
  USING (is_circle_member(auth.uid(), circle_id));

DROP POLICY IF EXISTS "Users can update own membership" ON public.family_circle_members;
CREATE POLICY "Users can update own membership" ON public.family_circle_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave circles" ON public.family_circle_members;
CREATE POLICY "Users can leave circles" ON public.family_circle_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Fix family_messages policies
DROP POLICY IF EXISTS "Users can insert own messages" ON public.family_messages;
CREATE POLICY "Users can insert own messages" ON public.family_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Users can view family messages" ON public.family_messages;
CREATE POLICY "Users can view family messages" ON public.family_messages
  FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() OR (circle_id IS NOT NULL AND is_circle_member(auth.uid(), circle_id)));

-- Add DELETE policy for message cleanup
CREATE POLICY "Users can delete own messages" ON public.family_messages
  FOR DELETE TO authenticated
  USING (sender_user_id = auth.uid());

-- Add message_type, expires_at, media_url columns to family_messages
ALTER TABLE public.family_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS media_url text;

-- Create storage bucket for family media (voice + photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-media', 'family-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for family-media bucket
CREATE POLICY "Authenticated users can upload family media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'family-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can read family media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'family-media');

CREATE POLICY "Users can delete own family media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'family-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role can delete expired media
CREATE POLICY "Service role can delete expired media"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'family-media');
