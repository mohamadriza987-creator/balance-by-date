ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS finny_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_finny_user_id_unique ON public.profiles (finny_user_id) WHERE finny_user_id IS NOT NULL;