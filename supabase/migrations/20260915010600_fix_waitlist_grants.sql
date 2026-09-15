-- Waitlist signup check runs as anon. New Supabase projects revoke PUBLIC execute,
-- so check_waitlist_approved always failed and Auth treated that as "not approved".

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.waitlist TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_waitlist_approved(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_waitlist_approved(check_email TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waitlist
    WHERE lower(trim(email)) = lower(trim(check_email))
      AND is_approved = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_waitlist_approved(text) TO anon, authenticated;
