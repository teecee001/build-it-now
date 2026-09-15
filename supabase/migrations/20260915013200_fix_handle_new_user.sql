CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  new_handle text;
  n int := 0;
BEGIN
  base := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF length(base) < 2 THEN
    base := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  base := left(base, 20);
  new_handle := '@' || base;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = new_handle) LOOP
    n := n + 1;
    new_handle := '@' || left(base, 16) || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    new_handle
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();

  RETURN NEW;
END;
$$;
