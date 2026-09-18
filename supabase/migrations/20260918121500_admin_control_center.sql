-- Combined waitlist + admin control (safe to re-run)

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


-- Admin control center: waitlist, users, activity, feedback.
-- All functions require admin (founder edwinmaurice11@gmail.com is auto-promoted).

CREATE OR REPLACE FUNCTION public._admin_guard()
RETURNS void
LANGUAGE plpgsql
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
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM public._admin_guard();
  SELECT jsonb_build_object(
    'waitlist_total', (SELECT count(*) FROM public.waitlist),
    'waitlist_pending', (SELECT count(*) FROM public.waitlist WHERE is_approved = false),
    'waitlist_approved', (SELECT count(*) FROM public.waitlist WHERE is_approved = true),
    'users_total', (SELECT count(*) FROM auth.users),
    'users_confirmed', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'usd_balance', (SELECT coalesce(sum(balance), 0) FROM public.wallets WHERE currency = 'USD'),
    'usd_savings', (SELECT coalesce(sum(savings_balance), 0) FROM public.wallets WHERE currency = 'USD'),
    'tx_total', (SELECT count(*) FROM public.transactions),
    'feedback_total', (SELECT count(*) FROM public.beta_feedback)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(u) ORDER BY u.created_at DESC)
    FROM (
      SELECT
        au.id,
        au.email,
        (au.email_confirmed_at IS NOT NULL) AS email_confirmed,
        au.created_at,
        au.last_sign_in_at,
        au.banned_until,
        p.full_name,
        p.handle,
        p.country_code,
        coalesce(w.balance, 0) AS usd_balance,
        coalesce(w.savings_balance, 0) AS usd_savings,
        EXISTS (
          SELECT 1 FROM public.user_roles r
          WHERE r.user_id = au.id AND r.role = 'admin'
        ) AS is_admin
      FROM auth.users au
      LEFT JOIN public.profiles p ON p.id = au.id
      LEFT JOIN public.wallets w ON w.user_id = au.id AND w.currency = 'USD'
    ) u
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_transactions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT
        tx.id,
        tx.user_id,
        au.email AS user_email,
        tx.type,
        tx.amount,
        tx.currency,
        tx.description,
        tx.recipient,
        tx.status,
        tx.created_at
      FROM public.transactions tx
      LEFT JOIN auth.users au ON au.id = tx.user_id
      ORDER BY tx.created_at DESC
      LIMIT 100
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_feedback()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(f) ORDER BY f.created_at DESC)
    FROM (
      SELECT
        bf.id,
        bf.user_id,
        au.email AS user_email,
        bf.type,
        bf.message,
        bf.page_url,
        bf.created_at
      FROM public.beta_feedback bf
      LEFT JOIN auth.users au ON au.id = bf.user_id
      ORDER BY bf.created_at DESC
      LIMIT 100
    ) f
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_waitlist_add(p_email text, p_approved boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text := lower(trim(p_email));
BEGIN
  PERFORM public._admin_guard();
  IF normalized IS NULL OR normalized !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;
  INSERT INTO public.waitlist (email, is_approved)
  VALUES (normalized, coalesce(p_approved, true))
  ON CONFLICT (email) DO UPDATE SET is_approved = EXCLUDED.is_approved;
  RETURN jsonb_build_object('ok', true, 'email', normalized, 'is_approved', coalesce(p_approved, true));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_waitlist_approve_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM public._admin_guard();
  UPDATE public.waitlist SET is_approved = true WHERE is_approved = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_confirm(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  UPDATE auth.users
  SET email_confirmed_at = coalesce(email_confirmed_at, now())
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_ban(p_user_id uuid, p_banned boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot ban yourself';
  END IF;
  UPDATE auth.users
  SET banned_until = CASE WHEN p_banned THEN '2099-01-01'::timestamptz ELSE NULL END
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_set_role(p_user_id uuid, p_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_email text;
BEGIN
  PERFORM public._admin_guard();
  SELECT email INTO target_email FROM auth.users WHERE id = p_user_id;
  IF lower(coalesce(target_email, '')) = 'edwinmaurice11@gmail.com' AND NOT p_admin THEN
    RAISE EXCEPTION 'cannot demote founder';
  END IF;
  IF p_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_feedback() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_waitlist_add(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_waitlist_approve_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_confirm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_ban(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_set_role(uuid, boolean) TO authenticated;

-- Keep waitlist joins working even if earlier grants were missed
GRANT EXECUTE ON FUNCTION public.join_waitlist(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_waitlist_approved(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_waitlist_approval(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_waitlist_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founder_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

INSERT INTO public.waitlist (email, is_approved)
VALUES ('edwinmaurice11@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_approved = true;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'edwinmaurice11@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
