ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS occupation_type text,
ADD COLUMN IF NOT EXISTS course text,
ADD COLUMN IF NOT EXISTS profession text;