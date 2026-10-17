-- Close the balance holes found in the 2026-10-17 audit.
-- Ledger changes here are the only supported way to create money, referrals, or pins.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. New wallets can only be opened at a zero balance, and only up to the
--    tier slot limit. Direct browser inserts are no longer allowed.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;

CREATE OR REPLACE FUNCTION public.open_currency_wallet(p_currency text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cur text;
  v_tier text;
  v_max int;
  v_count int;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_cur := upper(btrim(coalesce(p_currency, '')));
  IF v_cur !~ '^[A-Z0-9]{2,10}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;

  SELECT tier::text INTO v_tier FROM public.account_tiers WHERE user_id = v_user;
  v_max := CASE lower(coalesce(v_tier, 'personal'))
    WHEN 'pro' THEN 5
    WHEN 'business' THEN 8
    WHEN 'bank' THEN 100
    ELSE 3
  END;

  IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id = v_user AND currency = v_cur) THEN
    RAISE EXCEPTION 'You already have a % wallet', v_cur USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_count FROM public.wallets WHERE user_id = v_user;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Your % account supports up to % currencies. Upgrade to add more.',
      coalesce(v_tier, 'personal'), v_max USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.wallets (user_id, currency, balance, savings_balance)
  VALUES (v_user, v_cur, 0, 0)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_currency_wallet(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_currency_wallet(text) TO authenticated;

-- If a client insert policy is ever re-added, a non-zero opening balance still fails.
CREATE OR REPLACE FUNCTION public.wallets_reject_privileged_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'authenticated' THEN
    IF coalesce(NEW.balance, 0) <> 0 OR coalesce(NEW.savings_balance, 0) <> 0 THEN
      RAISE EXCEPTION 'Opening balance must be zero' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_reject_privileged_insert ON public.wallets;
CREATE TRIGGER wallets_reject_privileged_insert
  BEFORE INSERT ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.wallets_reject_privileged_insert();

-- ---------------------------------------------------------------------------
-- 2. Signup no longer mints a $25 welcome balance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
  VALUES (NEW.id, 0, 0, 'USD')
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
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Referral credit is one locked transaction. The old UNIQUE on
--    referrals.referral_code made a second friend fail the insert while the
--    edge function still paid both wallets, so the same user could redeem again.
-- ---------------------------------------------------------------------------
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_one_redemption_per_user
  ON public.referrals (referred_id)
  WHERE referred_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;

CREATE OR REPLACE FUNCTION public.redeem_referral(p_user uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_referrer uuid;
  v_reward numeric := 10;
  v_rows int;
  w record;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_code := upper(btrim(coalesce(p_code, '')));
  IF v_code = '' OR length(v_code) > 32 THEN
    RAISE EXCEPTION 'Referral code is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('redeem:' || p_user::text));

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_user) THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  SELECT id INTO v_referrer
    FROM public.profiles
   WHERE referral_code IS NOT NULL
     AND upper(referral_code) = v_code
   LIMIT 1;

  IF v_referrer IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code' USING ERRCODE = 'P0002';
  END IF;
  IF v_referrer = p_user THEN
    RAISE EXCEPTION 'You cannot use your own referral code' USING ERRCODE = '22023';
  END IF;

  FOR w IN
    SELECT user_id
      FROM public.wallets
     WHERE currency = 'USD' AND user_id IN (p_user, v_referrer)
     ORDER BY user_id
       FOR UPDATE
  LOOP
    NULL;
  END LOOP;

  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, reward_amount, completed_at)
  VALUES (v_referrer, p_user, v_code, 'completed', v_reward, now());

  UPDATE public.wallets
     SET balance = balance + v_reward, updated_at = now()
   WHERE user_id = v_referrer AND currency = 'USD';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Referrer wallet not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.wallets
     SET balance = balance + v_reward, updated_at = now()
   WHERE user_id = p_user AND currency = 'USD';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Your USD wallet was not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, description, status, metadata)
  VALUES
    (v_referrer, 'cashback', v_reward, 'USD', 'Referral bonus — friend joined ExoSky', 'completed',
      jsonb_build_object('referral', true, 'referred_user', p_user)),
    (p_user, 'cashback', v_reward, 'USD', 'Referral welcome bonus — $10 credited', 'completed',
      jsonb_build_object('referral', true, 'referrer_user', v_referrer));

  RETURN jsonb_build_object('success', true, 'already', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'already', true);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_referral(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Transaction PIN lives in the database, not the browser.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tx_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tx_pins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_tx_pin(p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.tx_pins (user_id, pin_hash, updated_at)
  VALUES (v_user, crypt(p_pin, gen_salt('bf')), now())
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_tx_pin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  DELETE FROM public.tx_pins WHERE user_id = v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tx_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tx_pins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.assert_tx_pin(p_user uuid, p_pin text, p_usd numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  SELECT pin_hash INTO v_hash FROM public.tx_pins WHERE user_id = p_user;
  IF v_hash IS NULL OR p_usd IS NULL OR p_usd <= 500 THEN
    RETURN;
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,6}$' OR crypt(p_pin, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'Incorrect or missing PIN' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_tx_pin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_tx_pin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_tx_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tx_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_tx_pin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tx_pin() TO authenticated;
REVOKE ALL ON FUNCTION public.assert_tx_pin(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_tx_pin(uuid, text, numeric) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Atomic ledger operations. Service role only. Prices are checked in the
--    edge function before these run; the row locks stop double-spends.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.savings_transfer(p_user uuid, p_direction text, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amt numeric;
  v_bal numeric;
  v_sav numeric;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_amt := round(p_amount, 8);
  IF v_amt IS NULL OR v_amt <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  SELECT balance, savings_balance INTO v_bal, v_sav
    FROM public.wallets
   WHERE user_id = p_user AND currency = 'USD'
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USD wallet not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_direction = 'to_savings' THEN
    IF v_bal < v_amt THEN RAISE EXCEPTION 'Insufficient wallet balance' USING ERRCODE = '23514'; END IF;
    UPDATE public.wallets
       SET balance = balance - v_amt, savings_balance = savings_balance + v_amt, updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    INSERT INTO public.transactions (user_id, type, amount, description, status, metadata)
    VALUES (p_user, 'deposit', -v_amt, 'Transfer to Savings', 'completed',
      jsonb_build_object('savings_transfer', true, 'direction', 'to_savings'));
  ELSIF p_direction = 'to_wallet' THEN
    IF coalesce(v_sav, 0) < v_amt THEN RAISE EXCEPTION 'Insufficient savings balance' USING ERRCODE = '23514'; END IF;
    UPDATE public.wallets
       SET balance = balance + v_amt, savings_balance = savings_balance - v_amt, updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    INSERT INTO public.transactions (user_id, type, amount, description, status, metadata)
    VALUES (p_user, 'deposit', v_amt, 'Withdrawal from Savings', 'completed',
      jsonb_build_object('savings_transfer', true, 'direction', 'to_wallet'));
  ELSE
    RAISE EXCEPTION 'Invalid direction' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_funds(
  p_user uuid, p_from text, p_to text, p_amount numeric, p_rate numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text;
  v_to text;
  v_amt numeric;
  v_rate numeric;
  v_credit numeric;
  v_from_id uuid;
  v_to_id uuid;
  v_bal numeric;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_from := upper(btrim(coalesce(p_from, '')));
  v_to := upper(btrim(coalesce(p_to, '')));
  v_amt := round(p_amount, 8);
  v_rate := p_rate;
  IF v_from !~ '^[A-Z0-9]{2,10}$' OR v_to !~ '^[A-Z0-9]{2,10}$' OR v_from = v_to THEN
    RAISE EXCEPTION 'Invalid currency pair' USING ERRCODE = '22023';
  END IF;
  IF v_amt IS NULL OR v_amt <= 0 OR v_rate IS NULL OR v_rate <= 0 THEN
    RAISE EXCEPTION 'Invalid amount or rate' USING ERRCODE = '22023';
  END IF;

  -- Lock both wallets in currency-code order so A→B and B→A cannot deadlock.
  -- Destination must already exist (open_currency_wallet enforces slot limits).
  IF v_from < v_to THEN
    SELECT id, balance INTO v_from_id, v_bal
      FROM public.wallets
     WHERE user_id = p_user AND currency = v_from
       FOR UPDATE;
    SELECT id INTO v_to_id
      FROM public.wallets
     WHERE user_id = p_user AND currency = v_to
       FOR UPDATE;
  ELSE
    SELECT id INTO v_to_id
      FROM public.wallets
     WHERE user_id = p_user AND currency = v_to
       FOR UPDATE;
    SELECT id, balance INTO v_from_id, v_bal
      FROM public.wallets
     WHERE user_id = p_user AND currency = v_from
       FOR UPDATE;
  END IF;
  IF v_from_id IS NULL THEN
    RAISE EXCEPTION 'No % wallet', v_from USING ERRCODE = 'P0002';
  END IF;
  IF v_bal + 0.00000001 < v_amt THEN
    RAISE EXCEPTION 'Insufficient % balance', v_from USING ERRCODE = '23514';
  END IF;
  IF v_to_id IS NULL THEN
    RAISE EXCEPTION 'Open a % wallet first', v_to USING ERRCODE = 'P0002';
  END IF;

  v_credit := round(v_amt * v_rate, 8);
  UPDATE public.wallets SET balance = balance - v_amt, updated_at = now() WHERE id = v_from_id;
  UPDATE public.wallets SET balance = balance + v_credit, updated_at = now() WHERE id = v_to_id;

  INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
  VALUES (
    p_user, 'conversion', -abs(v_amt), 'completed',
    format('Converted %s %s → %s %s', v_amt, v_from, v_credit, v_to),
    jsonb_build_object('from', v_from, 'to', v_to, 'from_amount', v_amt, 'to_amount', v_credit, 'rate', v_rate)
  );
  RETURN v_credit;
END;
$$;

CREATE OR REPLACE FUNCTION public.crypto_trade(
  p_user uuid, p_code text, p_action text, p_amount numeric, p_price numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_amt numeric;
  v_price numeric;
  v_units numeric;
  v_bal numeric;
  v_hold numeric;
  v_avg numeric;
  v_id uuid;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_code := upper(btrim(coalesce(p_code, '')));
  v_amt := p_amount;
  v_price := p_price;
  IF v_code !~ '^[A-Z0-9]{2,10}$' OR v_amt IS NULL OR v_amt <= 0 OR v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'Invalid parameters' USING ERRCODE = '22023';
  END IF;
  IF p_action NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;

  SELECT balance INTO v_bal FROM public.wallets
   WHERE user_id = p_user AND currency = 'USD' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No USD wallet' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.crypto_holdings (user_id, crypto_code, amount, avg_buy_price)
  VALUES (p_user, v_code, 0, 0)
  ON CONFLICT (user_id, crypto_code) DO NOTHING;

  SELECT id, amount, avg_buy_price INTO v_id, v_hold, v_avg
    FROM public.crypto_holdings
   WHERE user_id = p_user AND crypto_code = v_code
     FOR UPDATE;

  IF p_action = 'buy' THEN
    IF v_bal + 0.00000001 < v_amt THEN RAISE EXCEPTION 'Insufficient USD balance' USING ERRCODE = '23514'; END IF;
    v_units := v_amt / v_price;
    UPDATE public.wallets SET balance = balance - v_amt, updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    UPDATE public.crypto_holdings
       SET amount = amount + v_units,
           avg_buy_price = CASE WHEN amount + v_units > 0
             THEN ((avg_buy_price * amount) + (v_price * v_units)) / (amount + v_units)
             ELSE v_price END,
           updated_at = now()
     WHERE id = v_id;
    INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
    VALUES (p_user, 'purchase', -v_amt, 'completed',
      format('Bought %s %s', to_char(v_units, 'FM999999990.000000'), v_code),
      jsonb_build_object('crypto', v_code, 'crypto_amount', v_units, 'price_per_unit', v_price, 'action', 'buy'));
  ELSE
    IF coalesce(v_hold, 0) + 0.000000000001 < v_amt THEN
      RAISE EXCEPTION 'Insufficient % balance', v_code USING ERRCODE = '23514';
    END IF;
    UPDATE public.wallets SET balance = balance + (v_amt * v_price), updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    IF v_hold - v_amt <= 0.000001 THEN
      DELETE FROM public.crypto_holdings WHERE id = v_id;
    ELSE
      UPDATE public.crypto_holdings SET amount = amount - v_amt, updated_at = now() WHERE id = v_id;
    END IF;
    INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
    VALUES (p_user, 'purchase', v_amt * v_price, 'completed',
      format('Sold %s %s', to_char(v_amt, 'FM999999990.000000'), v_code),
      jsonb_build_object('crypto', v_code, 'crypto_amount', v_amt, 'price_per_unit', v_price, 'action', 'sell'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.crypto_swap(
  p_user uuid, p_from text, p_to text, p_units numeric, p_from_price numeric, p_to_price numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text;
  v_to text;
  v_units numeric;
  v_received numeric;
  v_hold numeric;
  v_id uuid;
  v_to_id uuid;
  v_to_amt numeric;
  v_to_avg numeric;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_from := upper(btrim(coalesce(p_from, '')));
  v_to := upper(btrim(coalesce(p_to, '')));
  v_units := p_units;
  IF v_from !~ '^[A-Z0-9]{2,10}$' OR v_to !~ '^[A-Z0-9]{2,10}$' OR v_from = v_to THEN
    RAISE EXCEPTION 'Invalid swap pair' USING ERRCODE = '22023';
  END IF;
  IF v_units IS NULL OR v_units <= 0 OR p_from_price IS NULL OR p_from_price <= 0 OR p_to_price IS NULL OR p_to_price <= 0 THEN
    RAISE EXCEPTION 'Invalid parameters' USING ERRCODE = '22023';
  END IF;

  -- Lock in code order so two opposite swaps cannot deadlock.
  IF v_from < v_to THEN
    INSERT INTO public.crypto_holdings (user_id, crypto_code, amount, avg_buy_price)
    VALUES (p_user, v_from, 0, 0) ON CONFLICT (user_id, crypto_code) DO NOTHING;
    INSERT INTO public.crypto_holdings (user_id, crypto_code, amount, avg_buy_price)
    VALUES (p_user, v_to, 0, 0) ON CONFLICT (user_id, crypto_code) DO NOTHING;
  ELSE
    INSERT INTO public.crypto_holdings (user_id, crypto_code, amount, avg_buy_price)
    VALUES (p_user, v_to, 0, 0) ON CONFLICT (user_id, crypto_code) DO NOTHING;
    INSERT INTO public.crypto_holdings (user_id, crypto_code, amount, avg_buy_price)
    VALUES (p_user, v_from, 0, 0) ON CONFLICT (user_id, crypto_code) DO NOTHING;
  END IF;

  IF v_from < v_to THEN
    SELECT id, amount INTO v_id, v_hold FROM public.crypto_holdings
     WHERE user_id = p_user AND crypto_code = v_from FOR UPDATE;
    SELECT id, amount, avg_buy_price INTO v_to_id, v_to_amt, v_to_avg FROM public.crypto_holdings
     WHERE user_id = p_user AND crypto_code = v_to FOR UPDATE;
  ELSE
    SELECT id, amount, avg_buy_price INTO v_to_id, v_to_amt, v_to_avg FROM public.crypto_holdings
     WHERE user_id = p_user AND crypto_code = v_to FOR UPDATE;
    SELECT id, amount INTO v_id, v_hold FROM public.crypto_holdings
     WHERE user_id = p_user AND crypto_code = v_from FOR UPDATE;
  END IF;

  IF coalesce(v_hold, 0) + 0.000000000001 < v_units THEN
    RAISE EXCEPTION 'Insufficient % balance', v_from USING ERRCODE = '23514';
  END IF;

  v_received := (v_units * p_from_price) / p_to_price;
  IF v_hold - v_units <= 0.000001 THEN
    DELETE FROM public.crypto_holdings WHERE id = v_id;
  ELSE
    UPDATE public.crypto_holdings SET amount = amount - v_units, updated_at = now() WHERE id = v_id;
  END IF;

  UPDATE public.crypto_holdings
     SET amount = amount + v_received,
         avg_buy_price = CASE WHEN amount + v_received > 0
           THEN ((avg_buy_price * amount) + (p_to_price * v_received)) / (amount + v_received)
           ELSE p_to_price END,
         updated_at = now()
   WHERE id = v_to_id;

  INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
  VALUES (p_user, 'conversion', -v_units, 'completed',
    format('Swapped %s %s → %s %s', v_units, v_from, v_received, v_to),
    jsonb_build_object('from', v_from, 'to', v_to, 'amount', v_units, 'received', v_received, 'action', 'swap'));
  RETURN v_received;
END;
$$;

CREATE OR REPLACE FUNCTION public.stock_trade(
  p_user uuid, p_ticker text, p_action text, p_shares numeric, p_price numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticker text;
  v_shares numeric;
  v_price numeric;
  v_dollars numeric;
  v_bal numeric;
  v_have numeric;
  v_id uuid;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_ticker := upper(btrim(coalesce(p_ticker, '')));
  v_shares := p_shares;
  v_price := p_price;
  IF v_ticker !~ '^[A-Z0-9.\-]{1,12}$' OR v_shares IS NULL OR v_shares <= 0 OR v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'Invalid parameters' USING ERRCODE = '22023';
  END IF;
  IF p_action NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;
  v_dollars := v_shares * v_price;

  SELECT balance INTO v_bal FROM public.wallets
   WHERE user_id = p_user AND currency = 'USD' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No USD wallet' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.stock_holdings (user_id, ticker, shares, avg_buy_price)
  VALUES (p_user, v_ticker, 0, 0)
  ON CONFLICT (user_id, ticker) DO NOTHING;
  SELECT id, shares INTO v_id, v_have FROM public.stock_holdings
   WHERE user_id = p_user AND ticker = v_ticker FOR UPDATE;

  IF p_action = 'buy' THEN
    IF v_bal + 0.00000001 < v_dollars THEN RAISE EXCEPTION 'Insufficient USD balance' USING ERRCODE = '23514'; END IF;
    UPDATE public.wallets SET balance = balance - v_dollars, updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    UPDATE public.stock_holdings
       SET shares = shares + v_shares,
           avg_buy_price = CASE WHEN shares + v_shares > 0
             THEN ((avg_buy_price * shares) + (v_price * v_shares)) / (shares + v_shares)
             ELSE v_price END,
           updated_at = now()
     WHERE id = v_id;
    INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
    VALUES (p_user, 'purchase', -v_dollars, 'completed',
      format('Bought %s shares of %s', v_shares, v_ticker),
      jsonb_build_object('stock', v_ticker, 'shares', v_shares, 'price_per_share', v_price, 'action', 'stock_buy'));
  ELSE
    IF coalesce(v_have, 0) + 0.00000001 < v_shares THEN
      RAISE EXCEPTION 'Insufficient % shares', v_ticker USING ERRCODE = '23514';
    END IF;
    UPDATE public.wallets SET balance = balance + v_dollars, updated_at = now()
     WHERE user_id = p_user AND currency = 'USD';
    IF v_have - v_shares <= 0.0001 THEN
      DELETE FROM public.stock_holdings WHERE id = v_id;
    ELSE
      UPDATE public.stock_holdings SET shares = shares - v_shares, updated_at = now() WHERE id = v_id;
    END IF;
    INSERT INTO public.transactions (user_id, type, amount, status, description, metadata)
    VALUES (p_user, 'purchase', v_dollars, 'completed',
      format('Sold %s shares of %s', v_shares, v_ticker),
      jsonb_build_object('stock', v_ticker, 'shares', v_shares, 'price_per_share', v_price, 'action', 'stock_sell'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bill_pay(p_user uuid, p_amount numeric, p_name text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amt numeric;
  v_name text;
  v_bal numeric;
  v_cash numeric;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  v_amt := round(p_amount, 2);
  v_name := left(btrim(coalesce(p_name, 'bill')), 80);
  IF v_amt IS NULL OR v_amt <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;
  SELECT balance INTO v_bal FROM public.wallets
   WHERE user_id = p_user AND currency = 'USD' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USD wallet not found' USING ERRCODE = 'P0002'; END IF;
  IF v_bal + 0.00000001 < v_amt THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = '23514';
  END IF;
  v_cash := round(v_amt * 0.01, 2);
  UPDATE public.wallets
     SET balance = balance - v_amt + v_cash, updated_at = now()
   WHERE user_id = p_user AND currency = 'USD';
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES
    (p_user, 'bill_payment', -v_amt, 'completed', format('Bill payment — %s', v_name)),
    (p_user, 'cashback', v_cash, 'completed', format('1%% cashback — %s', v_name));
  RETURN v_cash;
END;
$$;

REVOKE ALL ON FUNCTION public.savings_transfer(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.convert_funds(uuid, text, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crypto_trade(uuid, text, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crypto_swap(uuid, text, text, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stock_trade(uuid, text, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bill_pay(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.savings_transfer(uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_funds(uuid, text, text, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.crypto_trade(uuid, text, text, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.crypto_swap(uuid, text, text, numeric, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.stock_trade(uuid, text, text, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.bill_pay(uuid, numeric, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Identity challenges are stored server-side. The answer hash is not returned.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_challenges (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
ALTER TABLE public.identity_challenges ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. AI advisor quota: 30 requests per user per hour.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ai_usage_user_time ON public.ai_usage (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.consume_ai_quota()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  n int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ai:' || v_user::text));
  DELETE FROM public.ai_usage WHERE user_id = v_user AND created_at < now() - interval '2 hours';
  SELECT count(*) INTO n
    FROM public.ai_usage
   WHERE user_id = v_user AND created_at > now() - interval '1 hour';
  IF n >= 30 THEN
    RAISE EXCEPTION 'AI rate limit reached. Try again in an hour.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.ai_usage (user_id) VALUES (v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota() TO authenticated;
