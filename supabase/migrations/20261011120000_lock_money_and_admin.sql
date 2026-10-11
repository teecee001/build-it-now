-- Only the founder can hold the admin role.
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
  IF p_admin AND lower(coalesce(target_email, '')) <> 'edwinmaurice11@gmail.com' THEN
    RAISE EXCEPTION 'only the founder account can be admin';
  END IF;
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

DELETE FROM public.user_roles ur
USING auth.users au
WHERE ur.user_id = au.id
  AND ur.role = 'admin'
  AND lower(coalesce(au.email, '')) <> 'edwinmaurice11@gmail.com';

-- Browser can no longer invent crypto or stock balances.
DROP POLICY IF EXISTS "Users can insert own holdings" ON public.crypto_holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON public.crypto_holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON public.crypto_holdings;
DROP POLICY IF EXISTS "Users can insert own stock holdings" ON public.stock_holdings;
DROP POLICY IF EXISTS "Users can update own stock holdings" ON public.stock_holdings;
DROP POLICY IF EXISTS "Users can delete own stock holdings" ON public.stock_holdings;
