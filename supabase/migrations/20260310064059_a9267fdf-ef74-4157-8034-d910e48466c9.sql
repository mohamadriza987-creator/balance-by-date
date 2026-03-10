
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_code text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marital_status text DEFAULT NULL;

-- Assign finny_user_id to existing profiles that don't have one
UPDATE public.profiles
SET finny_user_id = LOWER(
  COALESCE(
    NULLIF(CONCAT(REPLACE(COALESCE(first_name, ''), ' ', ''), REPLACE(COALESCE(last_name, ''), ' ', '')), ''),
    REPLACE(COALESCE(name, 'user'), ' ', '')
  )
) || '_' || LEFT(id::text, 4)
WHERE finny_user_id IS NULL;
