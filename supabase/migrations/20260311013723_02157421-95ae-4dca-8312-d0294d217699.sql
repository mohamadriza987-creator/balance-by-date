
-- Allow service role to delete expired messages
CREATE POLICY "Service role can delete expired messages"
ON public.family_messages FOR DELETE TO service_role
USING (true);
