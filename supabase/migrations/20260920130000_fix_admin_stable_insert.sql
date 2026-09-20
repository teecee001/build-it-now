-- STABLE functions cannot INSERT. Guard must only check; promote founder in claim_founder_admin.

CREATE OR REPLACE FUNCTION public._admin_guard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_admin()
RETURNS TABLE(id uuid, email text, is_approved boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN QUERY
  SELECT w.id, w.email, w.is_approved, w.created_at
  FROM public.waitlist w
  ORDER BY w.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN jsonb_build_object(
    'waitlist_total', (SELECT count(*) FROM public.waitlist),
    'waitlist_pending', (SELECT count(*) FROM public.waitlist WHERE is_approved = false),
    'waitlist_approved', (SELECT count(*) FROM public.waitlist WHERE is_approved = true),
    'users_total', (SELECT count(*) FROM auth.users),
    'users_confirmed', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'usd_balance', (SELECT coalesce(sum(balance), 0) FROM public.wallets WHERE currency = 'USD'),
    'usd_savings', (SELECT coalesce(sum(savings_balance), 0) FROM public.wallets WHERE currency = 'USD'),
    'tx_total', (SELECT count(*) FROM public.transactions),
    'feedback_total', (SELECT count(*) FROM public.beta_feedback)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(u) ORDER BY u.created_at DESC)
    FROM (
      SELECT
        au.id, au.email,
        (au.email_confirmed_at IS NOT NULL) AS email_confirmed,
        au.created_at, au.last_sign_in_at, au.banned_until,
        p.full_name, p.handle, p.country_code,
        coalesce(w.balance, 0) AS usd_balance,
        coalesce(w.savings_balance, 0) AS usd_savings,
        EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = au.id AND r.role = 'admin') AS is_admin
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
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT tx.id, tx.user_id, au.email AS user_email, tx.type, tx.amount, tx.currency,
        tx.description, tx.recipient, tx.status, tx.created_at
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
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._admin_guard();
  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(f) ORDER BY f.created_at DESC)
    FROM (
      SELECT bf.id, bf.user_id, au.email AS user_email, bf.type, bf.message, bf.page_url, bf.created_at
      FROM public.beta_feedback bf
      LEFT JOIN auth.users au ON au.id = bf.user_id
      ORDER BY bf.created_at DESC
      LIMIT 100
    ) f
  ), '[]'::jsonb);
END;
$$;
