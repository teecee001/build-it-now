-- Anyone can join waitlist (SECURITY DEFINER bypasses broken INSERT RLS).
-- Founder edwinmaurice11@gmail.com is always admin + always waitlist-approved.

CREATE OR REPLACE FUNCTION public.join_waitlist(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text := lower(trim(p_email));
  inserted uuid;
BEGIN
  IF normalized IS NULL OR normalized !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  INSERT INTO public.waitlist (email, is_approved)
  VALUES (normalized, normalized = 'edwinmaurice11@gmail.com')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO inserted;

  RETURN jsonb_build_object('ok', true, 'duplicate', inserted IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_waitlist_approved(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(trim(check_email)) = 'edwinmaurice11@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.waitlist
      WHERE lower(trim(email)) = lower(trim(check_email))
        AND is_approved = true
    );
$$;

CREATE OR REPLACE FUNCTION public.claim_founder_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF lower(coalesce(auth.jwt() ->> 'email', '')) IS DISTINCT FROM 'edwinmaurice11@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.waitlist (email, is_approved)
  VALUES ('edwinmaurice11@gmail.com', true)
  ON CONFLICT (email) DO UPDATE SET is_approved = true;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_admin()
RETURNS TABLE(id uuid, email text, is_approved boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'edwinmaurice11@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT w.id, w.email, w.is_approved, w.created_at
  FROM public.waitlist w
  ORDER BY w.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_waitlist_approval(p_id uuid, p_approved boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.waitlist SET is_approved = p_approved WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_waitlist_entry(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.waitlist WHERE id = p_id;
  RETURN FOUND;
END;
$$;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (COALESCE(is_approved, false) = false);

GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.waitlist TO authenticated;

GRANT EXECUTE ON FUNCTION public.join_waitlist(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_waitlist_approved(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founder_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_waitlist_approval(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_waitlist_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

INSERT INTO public.waitlist (email, is_approved)
VALUES ('edwinmaurice11@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_approved = true;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'edwinmaurice11@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE lower(email) = 'edwinmaurice11@gmail.com';
