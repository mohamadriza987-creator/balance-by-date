
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS TABLE(user_id uuid, first_name text, last_name text, finny_user_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.finny_user_id
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = lookup_email
  LIMIT 1;
$$;
