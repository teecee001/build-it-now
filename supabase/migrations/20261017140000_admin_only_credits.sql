-- Users can open a currency slot, but they cannot create a balance.
-- Only an admin can add money after signup. New accounts still receive the $25 test bonus.
-- Existing balances are left as they are.

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own empty wallets" ON public.wallets;

CREATE POLICY "Users can insert own empty wallets"
  ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND balance = 0
    AND coalesce(savings_balance, 0) = 0
  );

CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
  VALUES (NEW.id, 25.00, 0, 'USD')
  ON CONFLICT (user_id, currency) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_welcome_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (NEW.id, 'welcome_bonus', 25.00, 'Welcome to X Money — $25 bonus credited', 'completed');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  p_email text,
  p_amount numeric,
  p_currency text DEFAULT 'USD'
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid;
  v_cur text;
  v_amt numeric;
  v_id uuid;
  v_bal numeric;
BEGIN
  PERFORM public._admin_guard();
  v_cur := upper(btrim(coalesce(p_currency, 'USD')));
  v_amt := round(p_amount, 8);
  IF v_amt IS NULL OR v_amt <= 0 OR v_amt > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;
  IF v_cur !~ '^[A-Z0-9]{2,10}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_user
    FROM auth.users
   WHERE lower(email) = lower(btrim(coalesce(p_email, '')));
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No account for that email' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, balance INTO v_id, v_bal
    FROM public.wallets
   WHERE user_id = v_user AND currency = v_cur
   FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency, balance, savings_balance)
    VALUES (v_user, v_cur, v_amt, 0)
    RETURNING id, balance INTO v_id, v_bal;
  ELSE
    UPDATE public.wallets
       SET balance = balance + v_amt, updated_at = now()
     WHERE id = v_id
     RETURNING balance INTO v_bal;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, description, status, metadata)
  VALUES (
    v_user, 'deposit', v_amt, v_cur, 'Admin credit', 'completed',
    jsonb_build_object('admin_credit', true, 'by', auth.uid())
  );
  RETURN v_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_credit_wallet(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(text, numeric, text) TO authenticated;
